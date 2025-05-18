import React, { useEffect, useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { supabase } from '../lib/supabase';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

type AttendanceRecord = {
  id: string;
  record_time: string;
  members?: {
    name: string;
    phone: string;
    status?: string;
  };
};

type GuestRecord = {
  id: string;
  guest_name: string;
  guest_phone: string;
  attendances?: {
    record_time: string;
  };
};

export default function ParticipationLog() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().tz('Asia/Seoul').format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [exporting, setExporting] = useState(false);
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    setExporting(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const opt = {
      margin: 0.5,
      filename: `참여기록_${selectedDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(pdfRef.current).save();
    setExporting(false);
  };

  useEffect(() => {
    const isStoredAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isStoredAdmin) {
      setShowPasswordPrompt(true);
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      setError('');
      const start = dayjs(selectedDate).tz('Asia/Seoul').startOf('day').utc().format();
      const end = dayjs(selectedDate).tz('Asia/Seoul').endOf('day').utc().format();

      const { data: attendances, error: err1 } = await supabase
        .from('attendances')
        .select('id,record_time,members(name,phone,status)')
        .gte('record_time', start)
        .lte('record_time', end)
        .order('record_time', { ascending: true });

      const { data: guestsDataRaw, error: err2 } = await supabase
        .from('attendance_guests')
        .select(`
          id,
          guest_name,
          guest_phone,
          attendance_id,
          attendances!attendance_guests_attendance_id_fkey(record_time)
        `);

      const guestsData = (guestsDataRaw || []).filter(g => {
        const rt = g.attendances?.record_time;
        return rt && dayjs(rt).isBetween(start, end, null, '[]');
      }).sort((a, b) =>
        dayjs(a.attendances?.record_time).diff(dayjs(b.attendances?.record_time))
      );

      if (err1 || err2) {
        setError('참여 기록을 불러오지 못했습니다.');
        setAttendance([]);
        setGuests([]);
      } else {
        setAttendance((attendances || []).filter(a => a.members?.name));
        setGuests(guestsData || []);
      }

      setLoading(false);
    };

    fetchRecords();
  }, [selectedDate]);

  const handleDelete = async (rec: typeof displayData[number]) => {
    const confirmDelete = confirm(`${rec.name}님의 기록을 삭제할까요?`);
    if (!confirmDelete) return;

    if (rec.status === '게스트') {
      const { error } = await supabase.from('attendance_guests').delete().eq('id', rec.id);
      if (error) return alert('게스트 기록 삭제 실패');
    } else {
      const { error } = await supabase.from('attendances').delete().eq('id', rec.id);
      if (error) return alert('참여 기록 삭제 실패');
    }

    // Refresh data
    setAttendance(prev => prev.filter(a => a.id !== rec.id));
    setGuests(prev => prev.filter(g => g.id !== rec.id));
  };

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = (e.currentTarget.elements.namedItem('adminPassword') as HTMLInputElement).value;
    if (password === 'pikachu1029') {
      localStorage.setItem('isAdmin', 'true');
      setShowPasswordPrompt(false);
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  if (!authChecked || showPasswordPrompt) {
    return (
      <div className="max-w-md mx-auto mt-20 p-4 border rounded shadow">
        <h2 className="text-lg font-semibold mb-4">관리자 비밀번호 입력</h2>
        <form onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            name="adminPassword"
            placeholder="비밀번호 입력"
            className="border p-2 w-full mb-3"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-full">
            확인
          </button>
        </form>
      </div>
    );
  }

  const displayData = [
    ...attendance.map(a => ({
      id: a.id,
      name: a.members?.name || '',
      phone: a.members?.phone || '',
      status: a.members?.status || '',
      record_time: a.record_time,
    })),
    ...guests.map(g => ({
      id: g.id,
      name: g.guest_name,
      phone: g.guest_phone,
      status: '게스트',
      record_time: g.attendances?.record_time || '',
    })),
  ].sort((a, b) => dayjs(a.record_time).diff(dayjs(b.record_time)));

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6 print:p-0 print:bg-white">
      <div className="mb-4 flex items-center space-x-2">
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-black text-white px-4 py-2 rounded-full text-base pr-10 appearance-none h-9"
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg
              className="h-4 w-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6 2a1 1 0 100 2h8a1 1 0 100-2H6zM4 6a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2 2v2h2V8H6zm3 0v2h2V8H9zm3 0v2h2V8h-2zM6 11v2h2v-2H6zm3 0v2h2v-2H9zm3 0v2h2v-2h-2z" />
            </svg>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 text-sm print:hidden"
          >
            PDF 저장
          </button>
        )}
      </div>
      {loading ? (
        <p>불러오는 중...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div ref={pdfRef} className={exporting ? '' : 'hidden'}>
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-800">
              피클볼클럽&nbsp;&nbsp;[{dayjs(selectedDate).format('YYYY년 M월 D일')}] 참여기록
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">이름</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">휴대폰 번호</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">상태</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">기록 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4">
                        참여 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    displayData.map((rec) => (
                      <tr key={rec.id}>
                        <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">{rec.name}</td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">
                          {rec.phone && rec.phone.length === 8
                            ? `010-${rec.phone.slice(0, 4)}-${rec.phone.slice(4)}`
                            : rec.phone || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">{rec.status}</td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">
                          {dayjs(rec.record_time).tz('Asia/Seoul').format('HH시 mm분')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">이름</th>
                  <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">휴대폰 번호</th>
                  <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">상태</th>
                  <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">기록 시각</th>
                  {isAdmin && <th className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">삭제</th>}
                </tr>
              </thead>
              <tbody>
                {displayData.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="text-center py-4">
                      참여 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  displayData.map((rec) => (
                    <tr key={rec.id}>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">{rec.name}</td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">
                        {rec.phone && rec.phone.length === 8
                          ? `010-${rec.phone.slice(0, 4)}-${rec.phone.slice(4)}`
                          : rec.phone || ''}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">{rec.status}</td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm">
                        {dayjs(rec.record_time).tz('Asia/Seoul').format('HH시 mm분')}
                      </td>
                      {isAdmin && (
                        <td className="border border-gray-300 px-3 py-2 text-gray-700 text-sm text-center">
                          <button onClick={() => handleDelete(rec)} className="text-red-500 hover:underline">🗑</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <hr className="mt-8 border-t" />
    </div>
  );
}
