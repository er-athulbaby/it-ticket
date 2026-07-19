import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function sign(answer: number): string {
  return createHmac('sha256', process.env.NEXTAUTH_SECRET || 'secret')
    .update(String(answer))
    .digest('hex');
}

export function verifyToken(answer: string, token: string): boolean {
  return sign(parseInt(answer)) === token;
}

export async function GET() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const answer = a + b;
  const token = sign(answer);
  return NextResponse.json({ question: `${a} + ${b}`, token });
}
