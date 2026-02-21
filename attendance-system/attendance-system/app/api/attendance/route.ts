import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // format: "2024-02"
  const employeeId = searchParams.get('employeeId');

  let where: any = {};

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    where.date = { gte: start, lt: end };
  }

  if (employeeId) {
    where.employeeId = employeeId;
  }

  const records = await prisma.attendance.findMany({
    where,
    include: { employee: { select: { name: true, shortName: true } } },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, shiftType, dayType } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Get today's date (date only, no time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lt: new Date(today.getTime() + 86400000) },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already checked in today', existing }, { status: 409 });
    }

    const record = await prisma.attendance.create({
      data: {
        employeeId,
        date: today,
        checkInAt: new Date(),
        shiftType: shiftType || 'INSTORE',
        dayType: dayType || 'FULL',
      },
      include: { employee: { select: { name: true, shortName: true } } },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('Check-in error:', error.message);
    return NextResponse.json({ error: 'Server error', detail: error.message }, { status: 500 });
  }
}
