'use client';
import { useState, useEffect } from 'react';

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: '', date: new Date().toISOString().slice(0, 10),
    shiftType: 'INSTORE', dayType: 'FULL', notes: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => { loadData(); }, [month]);

  useEffect(() => {
    fetch('/api/employees').then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  async function loadData() {
    setLoading(true);
    const res = await fetch(`/api/attendance?month=${month}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/attendance/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualForm),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Record saved successfully!');
      setShowManual(false);
      loadData();
    } else {
      setMessage(data.error || 'Error saving record');
    }
    setTimeout(() => setMessage(''), 3000);
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this attendance record?')) return;
    // We'll handle via a DELETE endpoint
    setMessage('Contact admin to delete records');
    setTimeout(() => setMessage(''), 3000);
  }

  // Group by date
  const grouped = records.reduce((acc: any, r: any) => {
    const date = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Records</h1>
        <div className="flex gap-3 items-center">
          <input type="month" className="input w-auto" value={month}
            onChange={e => setMonth(e.target.value)} />
          <button onClick={() => setShowManual(true)} className="btn-primary text-sm">
            + Manual Entry
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.includes('Error') || message.includes('error') || message.includes('Contact') ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Manual Entry Form */}
      {showManual && (
        <div className="card border-2 border-blue-200">
          <h2 className="text-lg font-bold mb-4">Manual Attendance Entry</h2>
          <form onSubmit={submitManual} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Employee *</label>
                <select className="input" required value={manualForm.employeeId}
                  onChange={e => setManualForm({ ...manualForm, employeeId: e.target.value })}>
                  <option value="">Select...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input" required value={manualForm.date}
                  onChange={e => setManualForm({ ...manualForm, date: e.target.value })} />
              </div>
              <div>
                <label className="label">Shift Type</label>
                <select className="input" value={manualForm.shiftType}
                  onChange={e => setManualForm({ ...manualForm, shiftType: e.target.value })}>
                  <option value="INSTORE">🏪 Instore</option>
                  <option value="INSTORE_DRIVING">🚗 Instore + Driving</option>
                </select>
              </div>
              <div>
                <label className="label">Day Type</label>
                <select className="input" value={manualForm.dayType}
                  onChange={e => setManualForm({ ...manualForm, dayType: e.target.value })}>
                  <option value="FULL">☀️ Full Day</option>
                  <option value="HALF">🌤️ Half Day</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Optional notes..."
                value={manualForm.notes} onChange={e => setManualForm({ ...manualForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Save Record</button>
              <button type="button" onClick={() => setShowManual(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats for month */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{records.length}</div>
          <div className="text-gray-500 text-sm">Total Records</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600">
            {records.filter(r => r.shiftType === 'INSTORE_DRIVING').length}
          </div>
          <div className="text-gray-500 text-sm">With Driving</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-orange-600">
            {records.filter(r => r.dayType === 'HALF').length}
          </div>
          <div className="text-gray-500 text-sm">Half Days</div>
        </div>
      </div>

      {/* Records grouped by date */}
      {loading ? (
        <div className="card text-center py-12 text-gray-400">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          No records for this month
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dayRecords]: any) => (
            <div key={date} className="card">
              <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">{date}</h3>
              <div className="space-y-2">
                {dayRecords.map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                        {record.employee?.shortName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-800">{record.employee?.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {record.notes && ` • ${record.notes}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${record.shiftType === 'INSTORE_DRIVING' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                        {record.shiftType === 'INSTORE_DRIVING' ? '🚗' : '🏪'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${record.dayType === 'HALF' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {record.dayType === 'HALF' ? '½' : '1'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
