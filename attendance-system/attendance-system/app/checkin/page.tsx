'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type Employee = {
  id: string;
  name: string;
  shortName: string;
  faceData: string | null;
  photoUrl: string | null;
};

type ShiftType = 'INSTORE' | 'INSTORE_DRIVING';
type DayType = 'FULL' | 'HALF';

type Stage = 'scanning' | 'confirm' | 'success' | 'error' | 'manual';

export default function CheckInPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stage, setStage] = useState<Stage>('scanning');
  const [recognized, setRecognized] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<ShiftType>('INSTORE');
  const [dayType, setDayType] = useState<DayType>('FULL');
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const scanIntervalRef = useRef<any>(null);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load employees and today's records
  useEffect(() => {
    fetch('/api/employees/public').then(r => r.json()).then(setEmployees).catch(() => {});
    fetch('/api/attendance/today').then(r => r.json()).then(setTodayRecords).catch(() => {});
  }, []);

  // Start camera
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Re-bind video stream and auto-scan when returning to scanning stage
  useEffect(() => {
    if (stage === 'scanning') {
      // Re-bind video srcObject in case it was lost during re-render
      if (videoRef.current && streamRef.current) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      }
      // Auto-start scan after a short delay to let the camera settle
      const autoScanTimer = setTimeout(() => {
        if (cameraReady || (videoRef.current && streamRef.current)) {
          startScan();
        }
      }, 1000);
      return () => clearTimeout(autoScanTimer);
    }
  }, [stage]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
  }

  // Capture frame as base64
  function captureFrame(): string | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  // Simple brightness-based face detection (checks if there's a face-like region)
  function hasFaceInFrame(): boolean {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return false;

    const imageData = ctx.getImageData(canvas.width / 4, canvas.height / 4, canvas.width / 2, canvas.height / 2);
    const data = imageData.data;
    let skinPixels = 0;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Skin tone detection
      if (r > 95 && g > 40 && b > 20 && r > b && Math.abs(r - g) > 15 && r > 100) {
        skinPixels++;
      }
    }

    return skinPixels > 50;
  }

  // Match face against stored employees using pixel similarity
  async function matchFace(frameData: string): Promise<Employee | null> {
    // Filter employees with face data
    const withFace = employees.filter(e => e.faceData);
    if (withFace.length === 0) return null;

    // For browser-based matching, we compare using canvas pixel data
    return new Promise((resolve) => {
      const testImg = new Image();
      testImg.onload = () => {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 50;
        testCanvas.height = 50;
        const testCtx = testCanvas.getContext('2d')!;
        testCtx.drawImage(testImg, 0, 0, 50, 50);
        const testData = testCtx.getImageData(0, 0, 50, 50).data;

        let bestMatch: Employee | null = null;
        let bestScore = 0;

        let pending = withFace.length;

        for (const emp of withFace) {
          const refImg = new Image();
          refImg.onload = () => {
            const refCanvas = document.createElement('canvas');
            refCanvas.width = 50;
            refCanvas.height = 50;
            const refCtx = refCanvas.getContext('2d')!;
            refCtx.drawImage(refImg, 0, 0, 50, 50);
            const refData = refCtx.getImageData(0, 0, 50, 50).data;

            // Pixel similarity score
            let diff = 0;
            for (let i = 0; i < testData.length; i += 4) {
              diff += Math.abs(testData[i] - refData[i]);
              diff += Math.abs(testData[i + 1] - refData[i + 1]);
              diff += Math.abs(testData[i + 2] - refData[i + 2]);
            }
            const similarity = 1 - (diff / (testData.length * 255));

            if (similarity > bestScore) {
              bestScore = similarity;
              bestMatch = emp;
            }

            pending--;
            if (pending === 0) {
              // Only accept if similarity is above threshold
              resolve(bestScore > 0.75 ? bestMatch : null);
            }
          };
          refImg.onerror = () => { pending--; if (pending === 0) resolve(null); };
          refImg.src = emp.faceData!;
        }

        if (withFace.length === 0) resolve(null);
      };
      testImg.onerror = () => resolve(null);
      testImg.src = frameData;
    });
  }

  async function startScan() {
    if (scanning) return;
    setScanning(true);
    setMessage('Looking for face...');

    let attempts = 0;
    const maxAttempts = 10;

    scanIntervalRef.current = setInterval(async () => {
      attempts++;
      const frame = captureFrame();
      if (!frame) return;

      const hasface = hasFaceInFrame();

      if (hasface) {
        clearInterval(scanIntervalRef.current);
        setMessage('Face detected! Matching...');

        const match = await matchFace(frame);
        setScanning(false);

        if (match) {
          // Check if already checked in today
          const alreadyIn = todayRecords.find(r => r.employeeId === match.id);
          if (alreadyIn) {
            setMessage(`${match.shortName} already checked in today ✓`);
            setTimeout(() => { setMessage(''); setStage('scanning'); }, 3000);
            return;
          }
          setRecognized(match);
          setStage('confirm');
          setMessage('');
        } else {
          setMessage('Face not recognized. Try manual check-in.');
          setTimeout(() => { setMessage(''); setStage('scanning'); }, 3000);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(scanIntervalRef.current);
        setScanning(false);
        setMessage('No face detected. Please look at camera.');
        setTimeout(() => setMessage(''), 3000);
      }
    }, 500);
  }

  async function confirmCheckIn() {
    if (!recognized) return;

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: recognized.id, shiftType, dayType }),
    });

    const data = await res.json();

    if (res.ok) {
      setStage('success');
      setTodayRecords(prev => [...prev, { employeeId: recognized.id }]);
      setTimeout(() => {
        setRecognized(null);
        setShiftType('INSTORE');
        setDayType('FULL');
        setSelectedEmployee('');
        setMessage('');
        setStage('scanning');
      }, 4000);
    } else {
      setMessage(data.error || 'Check-in failed');
      setStage('error');
      setTimeout(() => { setStage('scanning'); setMessage(''); }, 3000);
    }
  }

  async function manualCheckIn() {
    if (!selectedEmployee) return;
    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return;

    const alreadyIn = todayRecords.find(r => r.employeeId === emp.id);
    if (alreadyIn) {
      setMessage(`${emp.shortName} already checked in today`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setRecognized(emp);
    setStage('confirm');
    setMessage('');
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col" style={{ userSelect: 'none' }}>
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-gray-800">
        <div>
          <div className="text-2xl font-bold">📋 Attendance</div>
          <div className="text-gray-400 text-sm">{today}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-green-400">{currentTime}</div>
          <div className="text-gray-400 text-sm">{todayRecords.length} checked in today</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">

        {/* SCANNING STAGE */}
        {(stage === 'scanning') && (
          <div className="w-full max-w-lg space-y-4">
            {/* Camera view */}
            <div className="relative rounded-3xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="w-full h-full object-cover mirror" autoPlay muted playsInline
                style={{ transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef} className="hidden" />

              {/* Face guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-blue-400 border-dashed rounded-full opacity-60"
                  style={{ width: '45%', aspectRatio: '1' }} />
              </div>

              {scanning && (
                <div className="absolute inset-0 bg-blue-500 opacity-10 animate-pulse" />
              )}
            </div>

            {message && (
              <div className="bg-gray-800 text-center py-3 px-4 rounded-xl text-yellow-300 font-medium">
                {message}
              </div>
            )}

            {!scanning ? (
              <button onClick={startScan} disabled={!cameraReady}
                className="btn-primary w-full text-xl py-5">
                {cameraReady ? '📷 Start Face Scan' : 'Starting camera...'}
              </button>
            ) : (
              <div className="text-center py-4 text-blue-300 font-medium animate-pulse text-lg">
                🔍 Scanning...
              </div>
            )}

            {/* Manual check-in toggle */}
            <button onClick={() => setStage('manual')}
              className="w-full text-gray-400 text-sm py-2 hover:text-white transition-colors">
              Can't recognize? → Manual Check-in
            </button>
          </div>
        )}

        {/* MANUAL CHECK-IN */}
        {stage === 'manual' && (
          <div className="w-full max-w-md bg-gray-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-center">Manual Check-In</h2>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-4 text-white text-lg"
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.shortName} - {emp.name}
                  {todayRecords.find(r => r.employeeId === emp.id) ? ' ✓' : ''}
                </option>
              ))}
            </select>

            {message && <div className="text-yellow-300 text-center text-sm">{message}</div>}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={manualCheckIn} disabled={!selectedEmployee}
                className="btn-success py-4 text-lg disabled:opacity-50">
                Select
              </button>
              <button onClick={() => { setStage('scanning'); setMessage(''); }}
                className="btn-secondary py-4 text-lg">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CONFIRM CHECK-IN */}
        {stage === 'confirm' && recognized && (
          <div className="w-full max-w-md bg-gray-800 rounded-3xl p-8 space-y-6 text-center">
            <div className="text-6xl">👤</div>
            <div>
              <div className="text-4xl font-bold text-green-400">{recognized.shortName}</div>
              <div className="text-gray-400 text-lg mt-1">{recognized.name}</div>
            </div>

            {/* Shift Type */}
            <div>
              <p className="text-gray-400 mb-3 font-medium">Shift Type</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShiftType('INSTORE')}
                  className={`py-4 rounded-xl font-bold text-lg transition-all ${shiftType === 'INSTORE' ? 'bg-blue-600 text-white scale-105' : 'bg-gray-700 text-gray-300'}`}>
                  🏪 Instore
                </button>
                <button
                  onClick={() => setShiftType('INSTORE_DRIVING')}
                  className={`py-4 rounded-xl font-bold text-lg transition-all ${shiftType === 'INSTORE_DRIVING' ? 'bg-blue-600 text-white scale-105' : 'bg-gray-700 text-gray-300'}`}>
                  🚗 +Driving
                </button>
              </div>
            </div>

            {/* Day Type */}
            <div>
              <p className="text-gray-400 mb-3 font-medium">Day Type</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDayType('FULL')}
                  className={`py-4 rounded-xl font-bold text-lg transition-all ${dayType === 'FULL' ? 'bg-green-600 text-white scale-105' : 'bg-gray-700 text-gray-300'}`}>
                  ☀️ Full Day
                </button>
                <button
                  onClick={() => setDayType('HALF')}
                  className={`py-4 rounded-xl font-bold text-lg transition-all ${dayType === 'HALF' ? 'bg-yellow-600 text-white scale-105' : 'bg-gray-700 text-gray-300'}`}>
                  🌤️ Half Day
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={confirmCheckIn} className="btn-success py-5 text-xl">
                ✅ Check In
              </button>
              <button onClick={() => { setStage('scanning'); setRecognized(null); }}
                className="btn-secondary py-5 text-xl">
                ✗ Cancel
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {stage === 'success' && recognized && (
          <div className="w-full max-w-md text-center space-y-4">
            <div className="text-8xl animate-bounce">✅</div>
            <div className="text-4xl font-bold text-green-400">Check-In Recorded!</div>
            <div className="text-2xl text-white">{recognized.shortName}</div>
            <div className="text-gray-400">
              {shiftType === 'INSTORE' ? '🏪 Instore' : '🚗 Instore + Driving'} •{' '}
              {dayType === 'FULL' ? '☀️ Full Day' : '🌤️ Half Day'}
            </div>
            <div className="text-green-300 text-lg font-mono">{currentTime}</div>
            <div className="text-gray-500 text-sm mt-4">Returning to scan in 4 seconds...</div>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div className="w-full max-w-md text-center space-y-4">
            <div className="text-8xl">❌</div>
            <div className="text-3xl font-bold text-red-400">Check-In Failed</div>
            <div className="text-gray-300">{message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
