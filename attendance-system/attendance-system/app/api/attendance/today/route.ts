import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: { employee: { select: { name: true, shortName: true } } },
    orderBy: { checkInAt: 'asc' },
  });

  return NextResponse.json(records);
}
