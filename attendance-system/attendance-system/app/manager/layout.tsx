import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ManagerNav from '@/components/ManagerNav';

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== 'manager') {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ManagerNav />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
