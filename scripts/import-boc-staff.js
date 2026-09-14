// Imports staff from a Microsoft 365 user export CSV.
// Usage:
//   node scripts/import-boc-staff.js            -> dry run, prints a report only
//   node scripts/import-boc-staff.js --apply     -> actually writes to the database
//
// Reads DB connection from .env.local (same pattern as scripts/seed-tickets.js).

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// ---- load .env.local ----
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = process.env[m[1]] || m[2].trim();
  }
}

const APPLY = process.argv.includes('--apply');
const CSV_PATH = path.join(__dirname, 'data', 'BOC-USER.csv');

// ---- tiny CSV parser (handles quoted fields with commas) ----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---- name normalization for fuzzy matching ----
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\bdr\.?\b/g, '')
    .replace(/[.,'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(name) {
  return new Set(normalizeName(name).split(' ').filter((t) => t.length > 1));
}

function similarity(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let common = 0;
  for (const t of setA) if (setB.has(t)) common++;
  return common / Math.max(setA.size, setB.size);
}

// ---- email reconstruction from Azure AD guest UPN pattern ----
function resolveEmail(upn) {
  if (!upn) return null;
  const extMatch = upn.match(/^(.+)_([^_@]+\.[^_@]+)#EXT#@bahrainolympic\.onmicrosoft\.com$/i);
  if (extMatch) return `${extMatch[1]}@${extMatch[2]}`;
  const localPart = upn.split('@')[0];
  // GUID-looking local parts are system/resource accounts with no real email
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(localPart)) return null;
  if (/^[0-9a-f]{20,}$/i.test(localPart)) return null;
  return upn;
}

// "academy" deliberately excluded — "Bahrain Olympic Academy" is an internal BOC department, not an external body
const ASSOC_KEYWORDS = /\b(association|federation|council)\b/i;

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}. Place the export there first.`);
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let raw = fs.readFileSync(CSV_PATH, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1); // strip UTF-8 BOM (common in Windows/Excel exports)
  const rows = parseCsv(raw);
  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  const idx = {
    name: header.indexOf('Display name'),
    upn: header.indexOf('User principal name'),
    title: header.indexOf('Title'),
    dept: header.indexOf('Department'),
    license: header.indexOf('Licenses'),
    mobile: header.indexOf('Mobile Phone'),
    phone: header.indexOf('Phone number'),
  };

  if (idx.name === -1 || idx.upn === -1) {
    console.error('Could not find expected columns in the CSV header. Header found:', header);
    console.error('idx:', idx);
    await client.end();
    process.exit(1);
  }

  const { rows: existingStaff } = await client.query('SELECT id, name, department, email, mobile, association_id, staff_code FROM staff');
  const { rows: existingAssoc } = await client.query('SELECT id, name FROM associations');

  // Highest existing staff_code number, to continue the sequence
  let codeCounter = 0;
  for (const s of existingStaff) {
    const m = (s.staff_code || '').match(/(\d+)$/);
    if (m) codeCounter = Math.max(codeCounter, parseInt(m[1], 10));
  }
  function nextCode() { codeCounter++; return `BOC-${String(codeCounter).padStart(4, '0')}`; }

  function findAssociation(deptText) {
    if (!deptText) return { id: null, isNew: false, name: null };
    if (!ASSOC_KEYWORDS.test(deptText)) return null; // not association-like
    let best = null, bestScore = 0;
    for (const a of existingAssoc) {
      const score = similarity(a.name, deptText);
      if (score > bestScore) { bestScore = score; best = a; }
    }
    if (best && bestScore >= 0.6) return { id: best.id, isNew: false, name: best.name };
    return { id: null, isNew: true, name: deptText.trim() };
  }

  const matched = [];   // { existing, csvRow, score }
  const newInserts = []; // csv rows with no confident existing match
  const usedExistingIds = new Set();

  for (const r of dataRows) {
    const name = (r[idx.name] || '').trim();
    if (!name) continue;

    let best = null, bestScore = 0;
    for (const s of existingStaff) {
      if (usedExistingIds.has(s.id)) continue;
      const score = similarity(s.name, name);
      if (score > bestScore) { bestScore = score; best = s; }
    }

    if (best && bestScore >= 0.75) {
      usedExistingIds.add(best.id);
      matched.push({ existing: best, csvRow: r, score: bestScore });
    } else {
      newInserts.push({ csvRow: r, reviewScore: bestScore, reviewCandidate: bestScore >= 0.4 ? best : null });
    }
  }

  console.log(`\n=== BOC Staff Import ${APPLY ? '(APPLY MODE)' : '(DRY RUN)'} ===`);
  console.log(`CSV rows: ${dataRows.length} | Existing staff: ${existingStaff.length} | Existing associations: ${existingAssoc.length}\n`);

  console.log(`--- MATCHED (will UPDATE, ${matched.length}) ---`);
  for (const m of matched.slice(0, 20)) {
    console.log(`  [${(m.score * 100).toFixed(0)}%] DB#${m.existing.id} "${m.existing.name}" <- CSV "${m.csvRow[idx.name]}"`);
  }
  if (matched.length > 20) console.log(`  ... and ${matched.length - 20} more`);

  const flaggedForReview = newInserts.filter((n) => n.reviewCandidate);
  console.log(`\n--- REVIEW SUGGESTED (treated as NEW, but similar to an existing record, ${flaggedForReview.length}) ---`);
  for (const n of flaggedForReview.slice(0, 20)) {
    console.log(`  [${(n.reviewScore * 100).toFixed(0)}%] CSV "${n.csvRow[idx.name]}" ~ DB#${n.reviewCandidate.id} "${n.reviewCandidate.name}"`);
  }
  if (flaggedForReview.length > 20) console.log(`  ... and ${flaggedForReview.length - 20} more`);

  console.log(`\n--- NEW INSERTS (${newInserts.length}) ---`);
  console.log(`  (${newInserts.length - flaggedForReview.length} clean new + ${flaggedForReview.length} flagged above)`);

  const unmatchedExisting = existingStaff.filter((s) => !usedExistingIds.has(s.id));
  console.log(`\n--- EXISTING STAFF WITH NO CSV MATCH (left untouched, ${unmatchedExisting.length}) ---`);

  if (!APPLY) {
    console.log('\nDry run only — no changes made. Re-run with --apply to write to the database.');
    await client.end();
    return;
  }

  // ---- APPLY ----
  let updated = 0, inserted = 0, assocCreated = 0, skipped = 0;

  async function resolveAssoc(deptText) {
    const info = findAssociation(deptText);
    if (!info) return { association_id: null, department: deptText?.trim() || null };
    if (info.isNew) {
      const res = await client.query('INSERT INTO associations (name) VALUES ($1) RETURNING id', [info.name]);
      assocCreated++;
      return { association_id: res.rows[0].id, department: null };
    }
    return { association_id: info.id, department: null };
  }

  for (const m of matched) {
    const r = m.csvRow;
    const email = resolveEmail(r[idx.upn]);
    const mobile = (r[idx.mobile] || '').replace(/^'/, '').trim() || null;
    const deptText = (r[idx.dept] || '').trim();
    const license = (r[idx.license] || '').trim() || null;
    const { association_id, department } = await resolveAssoc(deptText);

    const staffCode = m.existing.staff_code || nextCode();
    try {
      await client.query(
        `UPDATE staff SET
           email = COALESCE(email, $1),
           department = COALESCE(NULLIF(department, ''), $2),
           mobile = COALESCE(mobile, $3),
           association_id = COALESCE(association_id, $4),
           ms_license = COALESCE(ms_license, $5),
           staff_code = COALESCE(staff_code, $6)
         WHERE id = $7`,
        [email, department, mobile, association_id, license, staffCode, m.existing.id]
      );
      updated++;
    } catch (e) {
      console.log(`  SKIP update DB#${m.existing.id} (${m.existing.name}): ${e.message}`);
      skipped++;
    }
  }

  for (const n of newInserts) {
    const r = n.csvRow;
    const name = r[idx.name].trim();
    const email = resolveEmail(r[idx.upn]);
    const mobile = (r[idx.mobile] || '').replace(/^'/, '').trim() || null;
    const deptText = (r[idx.dept] || '').trim();
    const license = (r[idx.license] || '').trim() || null;
    const { association_id, department } = await resolveAssoc(deptText);
    const staffCode = nextCode();

    try {
      await client.query(
        `INSERT INTO staff (name, department, email, mobile, association_id, ms_license, staff_code, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
        [name, department, email, mobile, association_id, license, staffCode]
      );
      inserted++;
    } catch (e) {
      console.log(`  SKIP insert "${name}": ${e.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Inserted: ${inserted}, Associations created: ${assocCreated}, Skipped (errors): ${skipped}`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
