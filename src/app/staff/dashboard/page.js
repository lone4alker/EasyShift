'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '../../../../components/ui/Breadcrumbs';
import { supabase } from '@/app/utils/supabase';

export default function StaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Attendance / timer state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [attendanceLog, setAttendanceLog] = useState([]);

  // Schedule state
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [shifts, setShifts] = useState([
    { id: 1, date: new Date(), start: '09:00', end: '17:00', role: 'Cashier', location: 'Main' },
    { id: 2, date: new Date(Date.now() + 24*60*60*1000), start: '12:00', end: '20:00', role: 'Barista', location: 'West' },
    { id: 3, date: new Date(Date.now() + 2*24*60*60*1000), start: '10:00', end: '18:00', role: 'Stock', location: 'Main', changed: true },
  ]);

  // Availability & requests
  const [timeOffRequests, setTimeOffRequests] = useState([
    { id: 'r1', range: { from: '2025-10-10', to: '2025-10-12' }, status: 'approved' },
    { id: 'r2', range: { from: '2025-11-02', to: '2025-11-02' }, status: 'pending' }
  ]);
  const [unavailableDays, setUnavailableDays] = useState(['2025-10-07']);

  // Pay
  const [paySummary, setPaySummary] = useState({
    current: { hours: 28, estimatedPay: 560 },
    previous: { hours: 32, estimatedPay: 640 }
  });

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 'n1', type: 'schedule', text: 'Your shift on Fri changed to 10:00 - 18:00', time: '2h ago' },
    { id: 'n2', type: 'request', text: 'Time-off request Nov 2 approved', time: '1d ago' }
  ]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/staff/login');
        return;
      }
      if (isMounted) {
        setUser(session.user);
        setLoading(false);
      }
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.push('/staff/login');
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!isClockedIn) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isClockedIn]);

  const elapsed = useMemo(() => {
    if (!isClockedIn || !clockInTime) return '00:00:00';
    const diff = Math.max(0, Math.floor((now - clockInTime) / 1000));
    const hh = String(Math.floor(diff / 3600)).padStart(2, '0');
    const mm = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const ss = String(diff % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [now, isClockedIn, clockInTime]);

  const handleClockIn = () => {
    const ts = Date.now();
    setClockInTime(ts);
    setIsClockedIn(true);
  };

  const handleClockOut = () => {
    const out = Date.now();
    const entry = {
      id: `a-${out}`,
      in: new Date(clockInTime).toLocaleString(),
      out: new Date(out).toLocaleString(),
      duration: elapsed,
    };
    setAttendanceLog([entry, ...attendanceLog]);
    setIsClockedIn(false);
    setClockInTime(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/staff/login');
  };

  const toggleUnavailable = (isoDate) => {
    setUnavailableDays((prev) =>
      prev.includes(isoDate) ? prev.filter((d) => d !== isoDate) : [...prev, isoDate]
    );
  };

  const submitTimeOff = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const from = form.get('from');
    const to = form.get('to');
    if (!from || !to) return;
    const newReq = { id: `r-${Date.now()}`, range: { from, to }, status: 'pending' };
    setTimeOffRequests([newReq, ...timeOffRequests]);
    e.currentTarget.reset();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading Staff Dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-slate-500">Staff Portal</div>
              <div className="text-base font-semibold text-slate-800">Dashboard</div>
            </div>
          </div>

          <div className="hidden md:block max-w-lg flex-1 mx-6">
            <Breadcrumbs />
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition">Log Out</button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Hero row: Time Clock + Quick Stats */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Attendance & Time Clock</h2>
              <div className="text-xs text-slate-500">Signed in as {user?.email}</div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <div className="text-2xl font-mono font-bold text-slate-800">{elapsed}</div>
              </div>
              <div className="flex items-center gap-3">
                {!isClockedIn ? (
                  <button onClick={handleClockIn} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow">
                    Clock In
                  </button>
                ) : (
                  <button onClick={handleClockOut} className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold shadow">
                    Clock Out
                  </button>
                )}
              </div>
            </div>

            {/* Attendance log */}
            <div className="mt-5">
              <div className="text-sm font-medium text-slate-700 mb-2">Past Shifts</div>
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {attendanceLog.length === 0 && (
                  <div className="text-sm text-slate-500">No shifts recorded yet.</div>
                )}
                {attendanceLog.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                    <div className="text-sm text-slate-700">
                      <div className="font-semibold">{a.in.split(',')[0]}</div>
                      <div className="text-slate-500">{a.in.split(',')[1]} → {a.out.split(',')[1]}</div>
                    </div>
                    <div className="text-sm font-mono text-slate-800">{a.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pay summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">My Pay</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-700">Current Period</div>
                <div className="mt-2 text-2xl font-bold text-emerald-900">{paySummary.current.hours}h</div>
                <div className="text-sm text-emerald-700">Est. ${paySummary.current.estimatedPay}</div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="text-xs font-medium text-blue-700">Previous Period</div>
                <div className="mt-2 text-2xl font-bold text-blue-900">{paySummary.previous.hours}h</div>
                <div className="text-sm text-blue-700">Est. ${paySummary.previous.estimatedPay}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule + Availability/Requests */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Shift Schedule</h3>
              <div className="inline-flex items-center rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-sm ${viewMode === 'week' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Week</button>
                <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-sm ${viewMode === 'month' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>Month</button>
              </div>
            </div>

            {viewMode === 'week' ? (
              <div className="space-y-3">
                {shifts.map((s) => (
                  <div key={s.id} className={`p-4 rounded-xl border flex items-center justify-between ${s.changed ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-10 rounded-full ${s.role === 'Cashier' ? 'bg-blue-500' : s.role === 'Barista' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>
                      <div>
                        <div className="text-sm text-slate-500">{s.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                        <div className="font-semibold text-slate-800">{s.start} - {s.end} • {s.role} {s.location ? `@ ${s.location}` : ''}</div>
                      </div>
                    </div>
                    {s.changed && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-900 font-semibold">Updated</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <MiniMonthCalendar shifts={shifts} />
            )}
          </div>

          {/* Availability & Requests */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Availability & Requests</h3>
            <form onSubmit={submitTimeOff} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                  <input name="from" type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                  <input name="to" type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              <button type="submit" className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Request Time Off</button>
            </form>

            <div className="mt-5">
              <div className="text-sm font-medium text-slate-700 mb-2">Recurring Unavailability</div>
              <SimpleSelectableCalendar selectedDays={unavailableDays} onToggle={toggleUnavailable} />
            </div>

            <div className="mt-5">
              <div className="text-sm font-medium text-slate-700 mb-2">My Requests</div>
              <div className="space-y-2 max-h-40 overflow-auto pr-1">
                {timeOffRequests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                    <div className="text-sm text-slate-700">{r.range.from} → {r.range.to}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : r.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-800">Notifications</h3>
            <Link href="#" className="text-sm text-blue-600 hover:text-blue-800">View all</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 rounded-xl border border-slate-100 bg-white flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${n.type === 'schedule' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {n.type === 'schedule' ? '📅' : '✅'}
                </div>
                <div>
                  <div className="text-sm text-slate-800">{n.text}</div>
                  <div className="text-xs text-slate-500 mt-1">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

// --- Small UI Helpers ---
function MiniMonthCalendar({ shifts }) {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const days = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const shiftDates = new Set(shifts.map((s) => new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate()).toDateString()));
  return (
    <div className="grid grid-cols-7 gap-2">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((w) => (
        <div key={w} className="text-xs text-slate-500 text-center">{w}</div>
      ))}
      {days.map((d) => {
        const key = d.toDateString();
        const isToday = key === new Date().toDateString();
        const hasShift = shiftDates.has(key);
        return (
          <div key={key} className={`aspect-square rounded-xl border flex items-center justify-center ${isToday ? 'border-slate-900' : 'border-slate-200'} ${hasShift ? 'bg-blue-50' : 'bg-white'}`}>
            <span className="text-sm font-medium text-slate-800">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function SimpleSelectableCalendar({ selectedDays, onToggle }) {
  const base = new Date();
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const days = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  const setSelected = new Set(selectedDays);
  const iso = (dt) => dt.toISOString().slice(0,10);

  return (
    <div className="grid grid-cols-7 gap-2">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((w) => (
        <div key={w} className="text-xs text-slate-500 text-center">{w}</div>
      ))}
      {days.map((d) => {
        const k = iso(d);
        const selected = setSelected.has(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => onToggle(k)}
            className={`aspect-square rounded-xl border text-sm font-medium transition ${selected ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'}`}
          >
            {d.getDate()}
          </button>
        );
      })}
    </div>
  );
}


