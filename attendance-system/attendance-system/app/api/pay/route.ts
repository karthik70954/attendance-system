import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const [year, mon] = month.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const employees = await prisma.employee.findMany({
    where: { active: true },
    include: {
      attendance: {
        where: { date: { gte: start, lt: end } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const report = employees.map((emp) => {
    let totalPay = 0;
    let fullDays = 0;
    let halfDays = 0;
    let instoreDays = 0;
    let drivingDays = 0;

    for (const att of emp.attendance) {
      const multiplier = att.dayType === 'HALF' ? 0.5 : 1;

      if (att.shiftType === 'INSTORE_DRIVING') {
        totalPay += (emp.dailyRate + emp.drivingRate) * multiplier;
        drivingDays++;
      } else {
        totalPay += emp.dailyRate * multiplier;
        instoreDays++;
      }

      if (att.dayType === 'FULL') fullDays++;
      else halfDays++;
    }

    return {
      id: emp.id,
      name: emp.name,
      shortName: emp.shortName,
      dailyRate: emp.dailyRate,
      drivingRate: emp.drivingRate,
      fullDays,
      halfDays,
      instoreDays,
      drivingDays,
      totalDays: fullDays + halfDays * 0.5,
      totalPay: Math.round(totalPay * 100) / 100,
      attendance: emp.attendance,
    };
  });

  return NextResponse.json({ month, report });
}
