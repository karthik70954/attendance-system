import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendScheduleEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { year, month, employeeId } = await req.json();

    if (!year || !month) {
      return NextResponse.json({ error: 'year and month required' }, { status: 400 });
    }

    // Build query - optionally filter by single employee
    const where: any = { year, month };
    if (employeeId) where.employeeId = employeeId;

    const schedules = await prisma.monthlySchedule.findMany({
      where,
      include: { employee: { select: { id: true, name: true, shortName: true, email: true, phone: true } } },
      orderBy: { date: 'asc' },
    });

    if (schedules.length === 0) {
      return NextResponse.json({ error: 'No schedules found for this month' }, { status: 404 });
    }

    // Group schedules by employee
    const byEmployee: Record<string, { employee: any; days: any[] }> = {};
    for (const s of schedules) {
      if (!byEmployee[s.employeeId]) {
        byEmployee[s.employeeId] = { employee: s.employee, days: [] };
      }
      byEmployee[s.employeeId].days.push({
        date: s.date,
        shiftType: s.shiftType,
        dayType: s.dayType,
        startTime: s.startTime,
        notes: s.notes,
      });
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month - 1];

    let sentCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const empId of Object.keys(byEmployee)) {
      const { employee, days } = byEmployee[empId];

      if (!employee.email) {
        skippedCount++;
        continue;
      }

      try {
        await sendScheduleEmail({
          employeeName: employee.name,
          employeeEmail: employee.email,
          monthName: `${monthName} ${year}`,
          days,
        });
        sentCount++;
      } catch (err: any) {
        errors.push(`${employee.shortName}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Send schedule error:', error.message);
    return NextResponse.json({ error: 'Server error', detail: error.message }, { status: 500 });
  }
}
