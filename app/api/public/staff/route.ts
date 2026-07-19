import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const staff = await query<{ id: number; name: string; department: string | null }>(
    'SELECT id, name, department FROM staff WHERE is_active = TRUE ORDER BY department ASC NULLS LAST, name ASC'
  );
  return NextResponse.json(staff);
}
