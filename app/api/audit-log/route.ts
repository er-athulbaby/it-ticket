import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entity_type') || '';
  const action = searchParams.get('action') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  if (entityType) { conditions.push(`entity_type = $${p++}`); params.push(entityType); }
  if (action) { conditions.push(`action = $${p++}`); params.push(action); }
  if (search) { conditions.push(`(entity_label ILIKE $${p} OR admin_name ILIKE $${p})`); params.push(`%${search}%`); p++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await query(`
    SELECT * FROM audit_log ${where}
    ORDER BY created_at DESC
    LIMIT $${p++} OFFSET $${p++}
  `, [...params, limit, offset]);

  const [{ count }] = await query<{ count: string }>(`SELECT COUNT(*) FROM audit_log ${where}`, params);
  const entityTypes = await query<{ entity_type: string }>(`SELECT DISTINCT entity_type FROM audit_log ORDER BY entity_type`);

  return NextResponse.json({ rows, total: parseInt(count), page, limit, entityTypes: entityTypes.map((e) => e.entity_type) });
}
