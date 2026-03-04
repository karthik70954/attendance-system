import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch monthly schedule for a given year/month (optionally filtered by employeeId)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const employeeId = searchParams.get('employeeId');

  const where: any = { year, month };
  if (employeeId) where.employeeId = employeeId;

  const schedules = await prisma.monthlySchedule.findMany({
    where,
    include: { employee: { select: { id: true, name: true, shortName: true, email: true } } },
    orderBy: [{ date: 'asc' }, { employee: { shortName: 'asc' } }],
  });

  return NextResponse.json(schedules);
}

// POST: Create or update schedule entries for an employee for a month
// Body: { employeeId, year, month, days: [{ date: "2026-03-05", shiftType, dayType, startTime, notes }] }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { employeeId, year, month, days } = await req.json();

    if (!employeeId || !year || !month || !Array.isArray(days)) {
      return NextResponse.json({ error: 'employeeId, year, month, and days[] required' }, { status: 400 });
    }

    // Upsert each day
    const results = [];
    for (const day of days) {
      const dateObj = new Date(day.date);
      dateObj.setUTCHours(0, 0, 0, 0);

      const result = await prisma.monthlySchedule.upsert({
        where: {
          employeeId_date: { employeeId, date: dateObj },
        },
        update: {
          shiftType: day.shiftType || 'INSTORE',
          dayType: day.dayType || 'FULL',
          startTime: day.startTime || '09:00',
          notes: day.notes || null,
        },
        create: {
          employeeId,
          year,
          month,
          date: dateObj,
          shiftType: day.shiftType || 'INSTORE',
          dayType: day.dayType || 'FULL',
          startTime: day.startTime || '09:00',
          notes: day.notes || null,
        },
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error('Monthly schedule error:', error.message);
    return NextResponse.json({ error: 'Server error', detail: error.message }, { status: 500 });
  }
}

// DELETE: Remove schedule entries for an employee for specific dates
// Body: { employeeId, dates: ["2026-03-05", ...] }
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { employeeId, dates } = await req.json();

    if (!employeeId || !Array.isArray(dates)) {
      return NextResponse.json({ error: 'employeeId and dates[] required' }, { status: 400 });
    }

    const dateObjs = dates.map(d => {
      const dt = new Date(d);
      dt.setUTCHours(0, 0, 0, 0);
      return dt;
    });

    await prisma.monthlySchedule.deleteMany({
      where: {
        employeeId,
        date: { in: dateObjs },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
