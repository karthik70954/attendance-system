'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ManagerDashboard() {
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/attendance/today').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([records, emps]) => {
      setTodayRecords(Array.isArray(records) ? records : []);
      setEmployees(Array.isArray(emps) ? emps : []);
      setLoading(false);
    });
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">{today}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-4xl font-bold text-blue-600">{loading ? '...' : todayRecords.length}</div>
          <div className="text-gray-500 text-sm mt-1">Checked In Today</div>
        </div>
        <div className="card text-center">
          <div className="text-4xl font-bold text-green-600">{loading ? '...' : employees.length}</div>
          <div className="text-gray-500 text-sm mt-1">Total Employees</div>
        </div>
        <div className="card text-center">
          <div className="text-4xl font-bold text-yellow-600">
            {loading ? '...' : todayRecords.filter(r => r.shiftType === 'INSTORE_DRIVING').length}
          </div>
          <div className="text-gray-500 text-sm mt-1">Driving Today</div>
        </div>
        <div className="card text-center">
          <div className="text-4xl font-bold text-purple-600">
            {loading ? '...' : todayRecords.filter(r => r.dayType === 'HALF').length}
          </div>
          <div className="text-gray-500 text-sm mt-1">Half Days Today</div>
        </div>
      </div>

      {/* Today's Attendance */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Today's Check-ins</h2>
          <Link href="/manager/attendance" className="text-sm text-blue-600 hover:underline">View All →</Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : todayRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No check-ins yet today</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayRecords.map((record: any) => (
              <div key={record.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                    {record.employee?.shortName?.slice(0, 2).toUpperCase() || '??'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{record.employee?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(record.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${record.shiftType === 'INSTORE_DRIVING' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                    {record.shiftType === 'INSTORE_DRIVING' ? '🚗 Driving' : '🏪 Instore'}
                  </span>
                  {record.dayType === 'HALF' && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                      🌤️ Half
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/manager/employees" className="card hover:shadow-lg transition-shadow cursor-pointer text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="font-semibold text-gray-700">Manage Employees</div>
        </Link>
        <Link href="/manager/attendance" className="card hover:shadow-lg transition-shadow cursor-pointer text-center">
          <div className="text-3xl mb-2">📋</div>
          <div className="font-semibold text-gray-700">Attendance Records</div>
        </Link>
        <Link href="/manager/pay" className="card hover:shadow-lg transition-shadow cursor-pointer text-center">
          <div className="text-3xl mb-2">💰</div>
          <div className="font-semibold text-gray-700">Pay Report</div>
        </Link>
      </div>
    </div>
  );
}
