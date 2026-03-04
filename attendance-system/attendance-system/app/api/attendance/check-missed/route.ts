import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendMissedCheckInAlert } from '@/lib/email';

export const dynamic = 'force-dynamic';

// This endpoint is called by Vercel Cron at 9:30 AM ET daily.
// It checks today's MonthlySchedule entries, finds employees who haven't checked in,
// and sends email alerts to both the employee and the manager.
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get today's date in US Eastern time
    const now = new Date();
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = etFormatter.formatToParts(now);
    const etYear = parseInt(parts.find(p => p.type === 'year')!.value);
    const etMonth = parseInt(parts.find(p => p.type === 'month')!.value);
    const etDay = parseInt(parts.find(p => p.type === 'day')!.value);

    // Build today's date as UTC midnight (matching how schedule dates are stored)
    const todayUTC = new Date(Date.UTC(etYear, etMonth - 1, etDay, 0, 0, 0, 0));

    // Find all schedule entries for today where alert hasn't been sent yet
    const todaySchedules = await prisma.monthlySchedule.findMany({
      where: {
        date: todayUTC,
        alertSent: false,
      },
      include: {
        employee: {
          select: { id: true, name: true, shortName: true, email: true, phone: true },
        },
      },
    });

    if (todaySchedules.length === 0) {
      return NextResponse.json({ message: 'No scheduled employees today or all alerts already sent', checked: 0 });
    }

    // Check which employees have already checked in today
    const scheduledEmployeeIds = todaySchedules.map(s => s.employeeId);

    const todayAttendance = await prisma.attendance.findMany({
      where: {
        employeeId: { in: scheduledEmployeeIds },
        date: todayUTC,
      },
      select: { employeeId: true },
    });

    const checkedInIds = new Set(todayAttendance.map(a => a.employeeId));

    // Find employees who missed check-in
    const missedSchedules = todaySchedules.filter(s => !checkedInIds.has(s.employeeId));

    if (missedSchedules.length === 0) {
      return NextResponse.json({ message: 'All scheduled employees have checked in!', checked: todaySchedules.length, missed: 0 });
    }

    // Get manager email for notifications
    const manager = await prisma.manager.findFirst({
      select: { email: true },
    });

    if (!manager) {
      return NextResponse.json({ error: 'No manager found in database' }, { status: 500 });
    }

    const dateStr = `${etMonth}/${etDay}/${etYear}`;
    let sentCount = 0;
    const errors: string[] = [];

    for (const schedule of missedSchedules) {
      try {
        await sendMissedCheckInAlert({
          employeeName: schedule.employee.name,
          employeeEmail: schedule.employee.email,
          managerEmail: manager.email,
          date: dateStr,
          startTime: schedule.startTime,
        });

        // Mark alert as sent so we don't send duplicates
        await prisma.monthlySchedule.update({
          where: { id: schedule.id },
          data: { alertSent: true },
        });

        sentCount++;
      } catch (err: any) {
        errors.push(`${schedule.employee.shortName}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      scheduled: todaySchedules.length,
      checkedIn: checkedInIds.size,
      missed: missedSchedules.length,
      alertsSent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Check missed error:', error.message);
    return NextResponse.json({ error: 'Server error', detail: error.message }, { status: 500 });
  }
}
