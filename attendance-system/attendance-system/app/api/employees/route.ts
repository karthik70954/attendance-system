import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, shortName: true, email: true,
      phone: true, dailyRate: true, drivingRate: true,
      photoUrl: true, faceData: true, active: true,
    },
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, shortName, email, phone, dailyRate, drivingRate, photoUrl, faceData } = await req.json();

    if (!name || !shortName) {
      return NextResponse.json({ error: 'Name and short name required' }, { status: 400 });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        shortName,
        email: email || null,
        phone: phone || null,
        dailyRate: parseFloat(dailyRate) || 0,
        drivingRate: parseFloat(drivingRate) || 0,
        photoUrl: photoUrl || null,
        faceData: faceData || null,
      },
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error('Create employee error:', error.message);
    return NextResponse.json({ error: 'Server error', detail: error.message }, { status: 500 });
  }
}
