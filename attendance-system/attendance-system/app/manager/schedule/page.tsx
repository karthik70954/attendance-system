'use client';
import { useState, useEffect } from 'react';

type Employee = {
  id: string; name: string; shortName: string; email: string | null;
};

type ScheduleEntry = {
  id: string;
  employeeId: string;
  date: string;
  shiftType: 'INSTORE' | 'INSTORE_DRIVING';
  dayType: 'FULL' | 'HALF';
  startTime: string;
  notes: string | null;
  employee: { id: string; name: string; shortName: string; email: string | null };
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function MonthlySchedulePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // For quick-assign mode
  const [assignMode, setAssignMode] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignShift, setAssignShift] = useState<'INSTORE' | 'INSTORE_DRIVING'>('INSTORE');
  const [assignDayType, setAssignDayType] = useState<'FULL' | 'HALF'>('FULL');
  const [assignStartTime, setAssignStartTime] = useState('09:00');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [year, month]);

  async function loadEmployees() {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }

  async function loadSchedules() {
    setLoading(true);
    const res = await fetch(`/api/schedule/monthly?year=${year}&month=${month}`);
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function toggleDate(dateStr: string) {
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }

  function selectWeekdays() {
    const daysInMonth = getDaysInMonth(year, month);
    const newDates = new Set<string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month - 1, d);
      const day = dt.getDay();
      if (day !== 0 && day !== 6) { // Mon-Fri
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        newDates.add(dateStr);
      }
    }
    setSelectedDates(newDates);
  }

  function selectAllDays() {
    const daysInMonth = getDaysInMonth(year, month);
    const newDates = new Set<string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      newDates.add(dateStr);
    }
    setSelectedDates(newDates);
  }

  function clearSelection() {
    setSelectedDates(new Set());
  }

  async function saveSelectedDays() {
    if (!assignEmpId || selectedDates.size === 0) {
      setMessage('Select an employee and at least one date');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    const days = Array.from(selectedDates).map(dateStr => ({
      date: dateStr,
      shiftType: assignShift,
      dayType: assignDayType,
      startTime: assignStartTime,
    }));

    const res = await fetch('/api/schedule/monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: assignEmpId, year, month, days }),
    });

    if (res.ok) {
      const data = await res.json();
      setMessage(`Saved ${data.count} schedule entries!`);
      setSelectedDates(new Set());
      loadSchedules();
    } else {
      const data = await res.json();
      setMessage(data.error || 'Error saving schedule');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  }

  async function removeSchedule(empId: string, dateStr: string) {
    await fetch('/api/schedule/monthly', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: empId, dates: [dateStr] }),
    });
    loadSchedules();
  }

  async function sendSchedules() {
    const who = selectedEmpId === 'all' ? 'all employees' : employees.find(e => e.id === selectedEmpId)?.shortName || 'employee';
    if (!confirm(`Send ${MONTH_NAMES[month - 1]} ${year} schedule emails to ${who}?`)) return;

    setSending(true);
    setMessage('📨 Sending schedule emails...');

    try {
      const body: any = { year, month };
      if (selectedEmpId !== 'all') body.employeeId = selectedEmpId;

      const res = await fetch('/api/schedule/monthly/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setSending(false);

      if (res.ok) {
        let msg = `✅ Sent to ${data.sent} employee(s)`;
        if (data.skipped) msg += `, ${data.skipped} skipped (no email)`;
        if (data.errors && data.errors.length > 0) msg += `\n⚠️ Issues: ${data.errors.join(', ')}`;
        setMessage(msg);
      } else {
        setMessage(`❌ ${data.error || 'Failed to send'}${data.detail ? ': ' + data.detail : ''}`);
      }
    } catch (err: any) {
      setSending(false);
      setMessage(`❌ Network error: ${err.message}`);
    }
    setTimeout(() => setMessage(''), 10000);
  }

  // Calendar rendering
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Get schedules for a specific date
  function getDateSchedules(day: number): ScheduleEntry[] {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter(s => {
      const d = new Date(s.date);
      return d.getUTCDate() === day && d.getUTCMonth() + 1 === month && d.getUTCFullYear() === year;
    }).filter(s => selectedEmpId === 'all' || s.employeeId === selectedEmpId);
  }

  function getDateStr(day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">📅 Monthly Schedule</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold">◀</button>
          <span className="text-xl font-bold text-gray-700 min-w-[200px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold">▶</button>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label className="text-sm font-medium text-gray-600">View:</label>
          <select
            className="input text-sm py-2 w-auto"
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
          >
            <option value="all">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.shortName} - {emp.name}</option>
            ))}
          </select>

          <button
            onClick={() => setAssignMode(!assignMode)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${assignMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          >
            {assignMode ? '✏️ Assign Mode ON' : '✏️ Assign Schedule'}
          </button>

          <button onClick={sendSchedules} disabled={sending}
            className="btn-success text-sm py-2 px-4 ml-auto disabled:opacity-50">
            {sending ? '📨 Sending...' : '📨 Send Schedule Emails'}
          </button>
        </div>

        {/* Assign mode controls */}
        {assignMode && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-blue-800">
              Select an employee, pick dates on the calendar, then save.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Employee *</label>
                <select className="input text-sm py-2" value={assignEmpId}
                  onChange={e => setAssignEmpId(e.target.value)}>
                  <option value="">Select...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.shortName} - {emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Shift</label>
                <select className="input text-sm py-2" value={assignShift}
                  onChange={e => setAssignShift(e.target.value as any)}>
                  <option value="INSTORE">🏪 Instore</option>
                  <option value="INSTORE_DRIVING">🚗 Instore + Driving</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Day Type</label>
                <select className="input text-sm py-2" value={assignDayType}
                  onChange={e => setAssignDayType(e.target.value as any)}>
                  <option value="FULL">☀️ Full Day</option>
                  <option value="HALF">🌤️ Half Day</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Start Time</label>
                <input type="time" className="input text-sm py-2" value={assignStartTime}
                  onChange={e => setAssignStartTime(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={selectWeekdays} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg">
                Select Weekdays (Mon-Fri)
              </button>
              <button onClick={selectAllDays} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg">
                Select All Days
              </button>
              <button onClick={clearSelection} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg">
                Clear Selection
              </button>
              <span className="text-xs text-gray-500 self-center ml-2">
                {selectedDates.size} day(s) selected
              </span>
              <button onClick={saveSelectedDays} disabled={loading || !assignEmpId || selectedDates.size === 0}
                className="btn-primary text-sm py-2 px-4 ml-auto disabled:opacity-50">
                {loading ? 'Saving...' : `💾 Save ${selectedDates.size} Day(s)`}
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.includes('Error') || message.includes('error') || message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center py-2 text-xs font-bold text-gray-500 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before the 1st */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[90px] border border-gray-100 bg-gray-50" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = getDateStr(day);
            const daySchedules = getDateSchedules(day);
            const isSelected = selectedDates.has(dateStr);
            const dt = new Date(year, month - 1, day);
            const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
            const isToday = dt.toDateString() === new Date().toDateString();

            return (
              <div
                key={day}
                onClick={() => assignMode && toggleDate(dateStr)}
                className={`min-h-[90px] border border-gray-100 p-1 transition-colors
                  ${isWeekend ? 'bg-gray-50' : ''}
                  ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}
                  ${assignMode ? 'cursor-pointer hover:bg-blue-50' : ''}
                  ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''}
                `}
              >
                <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : isWeekend ? 'text-gray-400' : 'text-gray-600'}`}>
                  {day}
                </div>
                {/* Schedule entries for this date */}
                <div className="space-y-0.5">
                  {daySchedules.map(s => (
                    <div key={s.id}
                      className={`text-[10px] px-1 py-0.5 rounded flex items-center justify-between group
                        ${s.shiftType === 'INSTORE' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}
                      `}
                    >
                      <span className="truncate font-medium">
                        {s.employee.shortName}
                        <span className="opacity-60 ml-0.5">{s.startTime}</span>
                        {s.dayType === 'HALF' && <span className="ml-0.5">½</span>}
                      </span>
                      {!assignMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSchedule(s.employeeId, dateStr); }}
                          className="hidden group-hover:inline text-red-500 hover:text-red-700 ml-1 font-bold"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Summary Table */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          Schedule Summary — {MONTH_NAMES[month - 1]} {year}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 font-semibold text-gray-600">Employee</th>
                <th className="px-3 py-2 font-semibold text-gray-600 text-center">Total Days</th>
                <th className="px-3 py-2 font-semibold text-gray-600 text-center">Full</th>
                <th className="px-3 py-2 font-semibold text-gray-600 text-center">Half</th>
                <th className="px-3 py-2 font-semibold text-gray-600 text-center">Driving</th>
                <th className="px-3 py-2 font-semibold text-gray-600">Email</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const empSchedules = schedules.filter(s => s.employeeId === emp.id);
                const fullDays = empSchedules.filter(s => s.dayType === 'FULL').length;
                const halfDays = empSchedules.filter(s => s.dayType === 'HALF').length;
                const drivingDays = empSchedules.filter(s => s.shiftType === 'INSTORE_DRIVING').length;

                if (empSchedules.length === 0) return null;

                return (
                  <tr key={emp.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="font-semibold text-blue-700">{emp.shortName}</span>
                      <span className="text-gray-400 ml-1 text-xs">{emp.name}</span>
                    </td>
                    <td className="px-3 py-2 text-center font-bold">{empSchedules.length}</td>
                    <td className="px-3 py-2 text-center">{fullDays}</td>
                    <td className="px-3 py-2 text-center">{halfDays}</td>
                    <td className="px-3 py-2 text-center">{drivingDays}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{emp.email || 'No email'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {schedules.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📅</div>
              <div>No schedules created yet for this month.</div>
              <div className="text-sm mt-1">Click "Assign Schedule" to start building the monthly schedule.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
