'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/manager', label: '📊 Dashboard', exact: true },
  { href: '/manager/employees', label: '👥 Employees' },
  { href: '/manager/attendance', label: '📋 Attendance' },
  { href: '/manager/pay', label: '💰 Pay Report' },
];

export default function ManagerNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="bg-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-1">
            <span className="font-bold text-lg mr-4">🏪 Attendance</span>
            {navItems.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-blue-700'}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/checkin" target="_blank"
              className="text-xs bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg transition-colors">
              📱 iPad View
            </Link>
            <button onClick={logout} className="text-xs bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
