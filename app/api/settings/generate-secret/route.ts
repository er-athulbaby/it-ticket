import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const secret = randomBytes(20).toString('hex');

  await query(
    `INSERT INTO app_settings (key, value) VALUES ('reminder_secret', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [secret]
  );

  return NextResponse.json({ secret });
}
