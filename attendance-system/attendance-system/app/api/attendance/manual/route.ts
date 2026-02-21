import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { employeeId, date, shiftType, dayType, notes } = await req.json();

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: targetDate, lt: new Date(targetDate.getTime() + 86400000) },
      },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { shiftType, dayType, notes },
      });
      return NextResponse.json(updated);
    }

    const record = await prisma.attendance.create({
      data: {
        employeeId,
        date: targetDate,
        checkInAt: targetDate,
        shiftType: shiftType || 'INSTORE',
        dayType: dayType || 'FULL',
        notes: notes || 'Manual entry',
      },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
