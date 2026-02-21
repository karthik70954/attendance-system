'use client';
import { useState, useEffect, useRef } from 'react';

type Employee = {
  id: string; name: string; shortName: string; email: string;
  phone: string; dailyRate: number; drivingRate: number;
  photoUrl: string | null; faceData: string | null; active: boolean;
};

const empty = { name: '', shortName: '', email: '', phone: '', dailyRate: '0', drivingRate: '0' };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }

  async function startCamera() {
    setShowCamera(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    // Draw centered square crop
    const size = Math.min(video.videoWidth, video.videoHeight);
    const ox = (video.videoWidth - size) / 2;
    const oy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, ox, oy, size, size, 0, 0, 200, 200);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedFace(dataUrl);
    setPhotoPreview(dataUrl);
    stopCamera();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPhotoPreview(result);
      setCapturedFace(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const payload = {
      ...form,
      dailyRate: parseFloat(form.dailyRate) || 0,
      drivingRate: parseFloat(form.drivingRate) || 0,
      photoUrl: capturedFace || null,
      faceData: capturedFace || null,
    };

    const url = editId ? `/api/employees/${editId}` : '/api/employees';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (res.ok) {
      setMessage(editId ? 'Employee updated!' : 'Employee added!');
      setForm(empty);
      setEditId(null);
      setShowForm(false);
      setCapturedFace(null);
      setPhotoPreview(null);
      loadEmployees();
    } else {
      const data = await res.json();
      setMessage(data.error || 'Error saving employee');
    }
  }

  function startEdit(emp: Employee) {
    setForm({
      name: emp.name, shortName: emp.shortName,
      email: emp.email || '', phone: emp.phone || '',
      dailyRate: String(emp.dailyRate), drivingRate: String(emp.drivingRate),
    });
    setPhotoPreview(emp.photoUrl || null);
    setCapturedFace(emp.faceData || null);
    setEditId(emp.id);
    setShowForm(true);
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Deactivate this employee?')) return;
    await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    loadEmployees();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Employees ({employees.length})</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(empty); setPhotoPreview(null); setCapturedFace(null); }}
          className="btn-primary">
          + Add Employee
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.includes('Error') || message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card border-2 border-blue-200">
          <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Employee' : 'Add New Employee'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="John Smith" required
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Short Name * (for iPad display)</label>
                <input className="input" placeholder="John" required maxLength={10}
                  value={form.shortName} onChange={e => setForm({ ...form, shortName: e.target.value })} />
              </div>
              <div>
                <label className="label">Email (for alerts)</label>
                <input className="input" type="email" placeholder="john@email.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="+1 555-000-0000"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Daily Rate ($)</label>
                <input className="input" type="number" min="0" step="0.01" placeholder="120"
                  value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} />
              </div>
              <div>
                <label className="label">Extra Driving Rate ($/day)</label>
                <input className="input" type="number" min="0" step="0.01" placeholder="30"
                  value={form.drivingRate} onChange={e => setForm({ ...form, drivingRate: e.target.value })} />
              </div>
            </div>

            {/* Face Photo */}
            <div>
              <label className="label">Face Photo (for face recognition)</label>
              {showCamera ? (
                <div className="space-y-2">
                  <video ref={videoRef} className="w-48 h-48 object-cover rounded-xl border"
                    style={{ transform: 'scaleX(-1)' }} autoPlay muted playsInline />
                  <div className="flex gap-2">
                    <button type="button" onClick={capturePhoto} className="btn-success text-sm py-2 px-4">📸 Capture</button>
                    <button type="button" onClick={stopCamera} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {photoPreview && <img src={photoPreview} alt="face" className="w-20 h-20 rounded-xl object-cover border" />}
                  <div className="flex gap-2">
                    <button type="button" onClick={startCamera} className="btn-secondary text-sm py-2 px-4">📷 Take Photo</button>
                    <label className="btn-secondary text-sm py-2 px-4 cursor-pointer">
                      📁 Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : editId ? 'Update Employee' : 'Add Employee'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setMessage(''); }}
                className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      <div className="card">
        {employees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">👥</div>
            <div>No employees yet. Add your first employee above.</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {employees.map(emp => (
              <div key={emp.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name} className="w-12 h-12 rounded-full object-cover border-2 border-blue-200" />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-lg">
                      {emp.shortName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-800">{emp.name}</div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium text-blue-600">{emp.shortName}</span>
                      {emp.email && ` • ${emp.email}`}
                    </div>
                    <div className="text-xs text-gray-400">
                      Instore: ${emp.dailyRate}/day
                      {emp.drivingRate > 0 && ` • Driving: +$${emp.drivingRate}`}
                      {emp.faceData ? ' • 📷 Face enrolled' : ' • ⚠️ No face photo'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(emp)}
                    className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg transition-colors">
                    Edit
                  </button>
                  <button onClick={() => deleteEmployee(emp.id)}
                    className="text-sm bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
