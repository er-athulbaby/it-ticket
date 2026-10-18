import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';

const PUBLIC_KEYS = ['company_name', 'ticket_prefix', 'logo_filename', 'theme'];

export async function GET() {
  const session = await auth();
  const isSuperadmin = (session?.user as { role?: string })?.role === 'superadmin';
  const rows = await query<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const settings: Record<string, string> = {};
  rows.forEach((r) => {
    if (isSuperadmin || PUBLIC_KEYS.includes(r.key)) settings[r.key] = r.value;
  });
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    await query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
  }

  return NextResponse.json({ success: true });
}
