'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/app/utils/translations';
import Breadcrumbs from '../../../../components/ui/Breadcrumbs';
import LanguageSwitcher from '../../../../components/ui/LanguageSwitcher';
import { supabase } from '@/app/utils/supabase';

// --- Reusable Request Form Component ---
const RequestForm = ({ submitHandler, submitState, t }) => {
  return (
    <fieldset className="border border-slate-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
      <legend className="px-2 text-xs sm:text-sm font-semibold text-slate-700">{t('staffDashboard.timeOff.requestForm.title')}</legend>
      <form onSubmit={submitHandler} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('staffDashboard.timeOff.requestForm.startDate')}</label>
            <input name="start-date" type="date" required className="w-full px-2 py-2 sm:px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('staffDashboard.timeOff.requestForm.startTime')}</label>
            <input name="start-time" type="time" required className="w-full px-2 py-2 sm:px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('staffDashboard.timeOff.requestForm.endDate')}</label>
            <input name="end-date" type="date" required className="w-full px-2 py-2 sm:px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('staffDashboard.timeOff.requestForm.endTime')}</label>
            <input name="end-time" type="time" required className="w-full px-2 py-2 sm:px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('staffDashboard.timeOff.requestForm.reason')}</label>
          <input name="reason" type="text" placeholder={t('staffDashboard.timeOff.requestForm.shortNote')} className="w-full px-2 py-2 sm:px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
        <button
          type="submit"
          disabled={submitState.loading}
          className={`w-full sm:w-auto px-4 py-2 rounded-lg text-white font-semibold text-sm ${submitState.loading ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {submitState.loading ? t('staffDashboard.timeOff.requestForm.sending') : t('staffDashboard.timeOff.requestForm.sendRequest')}
        </button>
        {submitState.message && (
          <div className={`text-xs mt-1 ${submitState.kind === 'success' ? 'text-emerald-700' : submitState.kind === 'error' ? 'text-red-600' : 'text-slate-600'}`}>{submitState.message}</div>
        )}
      </form>
    </fieldset>
  );
};

// --- Main StaffDashboard Component ---
export default function StaffDashboard() {
  const { t } = useT();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState(null);

  // Attendance / timer state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [attendanceLog, setAttendanceLog] = useState([]);

  // Schedule state
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
  const [shifts, setShifts] = useState([
    { id: 1, date: new Date(), start: '09:00', end: '17:00', role: 'Cashier', location: 'Main' },
    { id: 2, date: new Date(Date.now() + 24 * 60 * 60 * 1000), start: '12:00', end: '20:00', role: 'Barista', location: 'West' },
    { id: 3, date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), start: '10:00', end: '18:00', role: 'Stock', location: 'Main', changed: true },
  ]);

  // Requests list (fetched after submit)
  const [timeOffRequests, setTimeOffRequests] = useState([]);

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
  const [submitState, setSubmitState] = useState({ loading: false, message: null, kind: 'info' });

  // --- Functions ---
  const fetchMyRequests = async (uid) => {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('request_id, start_datetime, end_datetime, status, reason, created_at')
      .eq('staff_id', uid)
      .order('created_at', { ascending: false })
      .limit(25);
    if (!error && data) setTimeOffRequests(data);
  };

  const resolveStaffId = async (sessionUser) => {
    try {
      if (!sessionUser?.id) return null;
      const { data, error } = await supabase
        .from('staff_members')
        .select('staff_id')
        .eq('user_id', sessionUser.id)
        .single();
      return data?.staff_id || null;
    } catch (e) {
      console.error('Error resolving staff ID:', e);
      return null;
    }
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!user || !staffId) {
      setSubmitState({ loading: false, message: 'Your staff profile could not be found. Please contact an administrator.', kind: 'error' });
      return;
    }

    setSubmitState({ loading: true, message: null, kind: 'info' });

    const form = new FormData(e.currentTarget);
    const startDate = form.get('start-date');
    const startTime = form.get('start-time');
    const endDate = form.get('end-date');
    const endTime = form.get('end-time');
    const reason = form.get('reason') || null;

    if (!startDate || !startTime || !endDate || !endTime) {
      setSubmitState({ loading: false, message: 'Please fill out all fields.', kind: 'error' });
      return;
    }

    const requestData = {
      staff_id: staffId,
      start_datetime: istToUtcIso(startDate, startTime),
      end_datetime: istToUtcIso(endDate, endTime),
      reason,
      status: 'pending',
    };

    const { error } = await supabase.from('time_off_requests').insert(requestData);

    if (!error) {
      await fetchMyRequests(staffId);
      e.currentTarget.reset();
      setSubmitState({ loading: false, message: 'Time off request sent.', kind: 'success' });
    } else {
      setSubmitState({ loading: false, message: error.message || 'Failed to send request', kind: 'error' });
    }
  };

  // --- Effects & Memos ---
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
        const sid = await resolveStaffId(session.user);
        setStaffId(sid);
        if (sid) {
          await fetchMyRequests(sid);
        }
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
  
  // --- UI Handlers ---
  const handleClockIn = () => {
    setClockInTime(Date.now());
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

  // Convert IST local (YYYY-MM-DD, HH:MM) to UTC ISO
  const istToUtcIso = (dateStr, timeStr) => {
    const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
    const [hh, mm] = timeStr.split(':').map((x) => parseInt(x, 10));
    const utcMs = Date.UTC(y, m - 1, d, hh, mm) - 330 * 60 * 1000;
    return new Date(utcMs).toISOString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">{t('staffDashboard.loading')}</div>
      </div>
    );
  }

  // --- Rendered Component ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-slate-500">{t('staffDashboard.staffPortal')}</div>
                <div className="text-sm sm:text-base font-semibold text-slate-800">{t('navigation.dashboard')}</div>
              </div>
            </div>
            <div className="hidden lg:block max-w-lg flex-1 mx-6">
              <Breadcrumbs />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="scale-90 sm:scale-100">
                <LanguageSwitcher />
              </div>
              <button onClick={handleLogout} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-white bg-red-500 hover:bg-red-600 transition text-sm">{t('buttons.signOut')}</button>
            </div>
          </div>
          <div className="block lg:hidden mt-3">
            <Breadcrumbs />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Hero row: Time Clock + Quick Stats */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800">{t('staffDashboard.attendance.title')}</h2>
              <div className="text-xs text-slate-500 truncate">{t('staffDashboard.attendance.signedInAs', { email: user?.email })}</div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className={`w-3 h-3 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-slate-800">{elapsed}</div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {!isClockedIn ? (
                  <button onClick={handleClockIn} className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow">
                    {t('staffDashboard.attendance.clockIn')}
                  </button>
                ) : (
                  <button onClick={handleClockOut} className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold shadow">
                    {t('staffDashboard.attendance.clockOut')}
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 sm:mt-5">
              <div className="text-xs sm:text-sm font-medium text-slate-700 mb-2">{t('staffDashboard.attendance.pastShifts')}</div>
              <div className="space-y-2 max-h-48 sm:max-h-56 overflow-auto pr-1">
                {attendanceLog.length === 0 && <div className="text-xs sm:text-sm text-slate-500">{t('staffDashboard.attendance.noShifts')}</div>}
                {attendanceLog.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border border-slate-100">
                    <div className="text-xs sm:text-sm text-slate-700 flex-1 min-w-0">
                      <div className="font-semibold truncate">{a.in.split(',')[0]}</div>
                      <div className="text-slate-500 text-xs">{a.in.split(',')[1]} → {a.out.split(',')[1]}</div>
                    </div>
                    <div className="text-xs sm:text-sm font-mono text-slate-800 ml-2">{a.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">{t('staffDashboard.pay.title')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-700">{t('staffDashboard.pay.currentPeriod')}</div>
                <div className="mt-2 text-lg sm:text-2xl font-bold text-emerald-900">{paySummary.current.hours}h</div>
                <div className="text-xs sm:text-sm text-emerald-700">Est. ${paySummary.current.estimatedPay}</div>
              </div>
              <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="text-xs font-medium text-blue-700">{t('staffDashboard.pay.previousPeriod')}</div>
                <div className="mt-2 text-lg sm:text-2xl font-bold text-blue-900">{paySummary.previous.hours}h</div>
                <div className="text-xs sm:text-sm text-blue-700">Est. ${paySummary.previous.estimatedPay}</div>
              </div>
            </div>
          </div>
        </section>
        {/* Schedule + Availability/Requests */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">{t('staffDashboard.schedule.title')}</h3>
              <div className="inline-flex items-center rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setViewMode('week')} className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm ${viewMode === 'week' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{t('staffDashboard.schedule.week')}</button>
                <button onClick={() => setViewMode('month')} className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm ${viewMode === 'month' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{t('staffDashboard.schedule.month')}</button>
              </div>
            </div>
            {viewMode === 'week' ? (
              <div className="space-y-2 sm:space-y-3">
                {shifts.map((s) => (
                  <div key={s.id} className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border flex items-center justify-between ${s.changed ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-white'}`}>
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-1.5 sm:w-2 h-8 sm:h-10 rounded-full ${s.role === 'Cashier' ? 'bg-blue-500' : s.role === 'Barista' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm text-slate-500 truncate">{s.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                        <div className="font-semibold text-slate-800 text-sm">{s.start} - {s.end} • {s.role} {s.location ? `@ ${s.location}` : ''}</div>
                      </div>
                    </div>
                    {s.changed && <span className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-900 font-semibold flex-shrink-0">{t('staffDashboard.schedule.updated')}</span>}
                  </div>
                ))}
              </div>
            ) : (<MiniMonthCalendar shifts={shifts} />)}
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">{t('staffDashboard.timeOff.title')}</h3>
            <RequestForm submitHandler={submitRequest} submitState={submitState} t={t} />
            <div className="mt-4 sm:mt-5">
              <div className="text-xs sm:text-sm font-medium text-slate-700 mb-2">{t('staffDashboard.timeOff.myRequests')}</div>
              <div className="space-y-2 max-h-32 sm:max-h-40 overflow-auto pr-1">
                {timeOffRequests.length === 0 && <div className="text-xs sm:text-sm text-slate-500">{t('staffDashboard.timeOff.noRequests')}</div>}
                {timeOffRequests.map((r) => (
                  <div key={r.request_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-white rounded-lg border border-slate-100 space-y-2 sm:space-y-0">
                    <div className="text-xs sm:text-sm text-slate-700 flex-1 min-w-0">
                      <div className="font-semibold text-xs sm:text-sm">
                        {new Date(r.start_datetime).toLocaleDateString()}
                        {r.start_datetime && new Date(r.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        →
                        {new Date(r.end_datetime).toLocaleDateString()}
                        {r.end_datetime && new Date(r.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{r.reason || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2 justify-start sm:justify-end">
                      <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : r.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        {/* Notifications */}
        <section className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800">{t('staffDashboard.notifications.title')}</h3>
            <Link href="#" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800">{t('staffDashboard.notifications.viewAll')}</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-100 bg-white flex items-start gap-2 sm:gap-3">
                <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-sm ${n.type === 'schedule' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {n.type === 'schedule' ? '📅' : '✅'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm text-slate-800">{n.text}</div>
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
  const days = useMemo(() => {
    const d = [];
    for (let current = new Date(first); current <= last; current.setDate(current.getDate() + 1)) {
      d.push(new Date(current));
    }
    return d;
  }, [first, last]);

  const shiftDates = useMemo(() => new Set(shifts.map((s) => new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate()).toDateString())), [shifts]);
  const todayKey = useMemo(() => new Date().toDateString(), []);

  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
        <div key={w} className="text-xs text-slate-500 text-center py-1">{w}</div>
      ))}
      {days.map((d) => {
        const key = d.toDateString();
        const isToday = key === todayKey;
        const hasShift = shiftDates.has(key);
        return (
          <div key={key} className={`aspect-square rounded-lg sm:rounded-xl border flex items-center justify-center ${isToday ? 'border-slate-900' : 'border-slate-200'} ${hasShift ? 'bg-blue-50' : 'bg-white'}`}>
            <span className="text-xs sm:text-sm font-medium text-slate-800">{d.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}