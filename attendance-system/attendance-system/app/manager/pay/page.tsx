'use client';
import { useState, useEffect } from 'react';

export default function PayReportPage() {
  const [report, setReport] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [totalPay, setTotalPay] = useState(0);

  useEffect(() => { loadReport(); }, [month]);

  async function loadReport() {
    setLoading(true);
    const res = await fetch(`/api/pay?month=${month}`);
    const data = await res.json();
    if (data.report) {
      setReport(data.report);
      setTotalPay(data.report.reduce((s: number, e: any) => s + e.totalPay, 0));
    }
    setLoading(false);
  }

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function printReport() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Pay Report</h1>
        <div className="flex gap-3 items-center">
          <input type="month" className="input w-auto" value={month}
            onChange={e => setMonth(e.target.value)} />
          <button onClick={printReport} className="btn-secondary text-sm">
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">
            {report.filter(e => e.totalDays > 0).length}
          </div>
          <div className="text-gray-500 text-sm">Employees Worked</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">
            {report.reduce((s, e) => s + e.fullDays, 0)}
          </div>
          <div className="text-gray-500 text-sm">Total Full Days</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600">
            {report.reduce((s, e) => s + e.drivingDays, 0)}
          </div>
          <div className="text-gray-500 text-sm">Driving Days</div>
        </div>
        <div className="card text-center bg-green-50">
          <div className="text-3xl font-bold text-green-700">
            ${totalPay.toFixed(2)}
          </div>
          <div className="text-gray-500 text-sm">Total Payroll</div>
        </div>
      </div>

      {/* Pay Table */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-bold mb-4">{monthLabel} — Employee Pay Breakdown</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : report.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No data for this month</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                <th className="text-left py-3 px-4">Employee</th>
                <th className="text-center py-3 px-3">Full Days</th>
                <th className="text-center py-3 px-3">Half Days</th>
                <th className="text-center py-3 px-3">Driving Days</th>
                <th className="text-center py-3 px-3">Total Days</th>
                <th className="text-right py-3 px-3">Daily Rate</th>
                <th className="text-right py-3 px-3">Driving Rate</th>
                <th className="text-right py-3 px-4 text-green-700 font-bold">Total Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.map(emp => (
                <tr key={emp.id} className={`hover:bg-gray-50 ${emp.totalDays === 0 ? 'opacity-40' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-800">{emp.name}</div>
                    <div className="text-xs text-gray-400">{emp.shortName}</div>
                  </td>
                  <td className="text-center py-3 px-3">{emp.fullDays}</td>
                  <td className="text-center py-3 px-3">{emp.halfDays}</td>
                  <td className="text-center py-3 px-3">
                    {emp.drivingDays > 0 ? <span className="text-yellow-600">{emp.drivingDays}</span> : '-'}
                  </td>
                  <td className="text-center py-3 px-3 font-medium">{emp.totalDays}</td>
                  <td className="text-right py-3 px-3 text-gray-600">${emp.dailyRate}</td>
                  <td className="text-right py-3 px-3 text-gray-600">
                    {emp.drivingRate > 0 ? `+$${emp.drivingRate}` : '-'}
                  </td>
                  <td className="text-right py-3 px-4 font-bold text-green-700 text-base">
                    ${emp.totalPay.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-green-50 font-bold border-t-2 border-green-200">
                <td className="py-3 px-4 text-gray-700">TOTAL</td>
                <td className="text-center py-3 px-3">{report.reduce((s, e) => s + e.fullDays, 0)}</td>
                <td className="text-center py-3 px-3">{report.reduce((s, e) => s + e.halfDays, 0)}</td>
                <td className="text-center py-3 px-3">{report.reduce((s, e) => s + e.drivingDays, 0)}</td>
                <td className="text-center py-3 px-3">{report.reduce((s, e) => s + e.totalDays, 0).toFixed(1)}</td>
                <td colSpan={2}></td>
                <td className="text-right py-3 px-4 text-green-700 text-lg">${totalPay.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
