import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const employees = await prisma.employee.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      shortName: true,
      faceData: true,
      photoUrl: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(employees);
}
