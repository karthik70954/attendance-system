import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        name: data.name,
        shortName: data.shortName,
        email: data.email || null,
        phone: data.phone || null,
        dailyRate: parseFloat(data.dailyRate) || 0,
        drivingRate: parseFloat(data.drivingRate) || 0,
        photoUrl: data.photoUrl || null,
        faceData: data.faceData || null,
        active: data.active ?? true,
      },
    });
    return NextResponse.json(employee);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.employee.update({
    where: { id: params.id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
