import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  const where: any = { active: true };
  if (employeeId) where.employeeId = employeeId;

  const schedules = await prisma.schedule.findMany({
    where,
    include: { employee: { select: { name: true, shortName: true } } },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { employeeId, dayOfWeek, startTime } = await req.json();

    // Delete existing schedule for this employee/day
    await prisma.schedule.deleteMany({
      where: { employeeId, dayOfWeek },
    });

    if (startTime) {
      const schedule = await prisma.schedule.create({
        data: { employeeId, dayOfWeek, startTime },
      });
      return NextResponse.json(schedule);
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
