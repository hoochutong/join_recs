import React, { useEffect, useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { supabase } from '../lib/supabase';
import isBetween from 'dayjs/plugin/isBetween';
import { DocumentTextIcon } from '@heroicons/react/24/solid';

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
  record_time?: string;
};

export default function ParticipationLog() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().tz('Asia/Seoul').format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    if (!isAdmin) return;

    const fetchRecords = async () => {
      setLoading(true);
      setError('');
      const start = dayjs(selectedDate).tz('Asia/Seoul').startOf('day').format();
      const end = dayjs(selectedDate).tz('Asia/Seoul').endOf('day').format();

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
          record_time,
          attendance_id,
          attendances!attendance_guests_attendance_id_fkey(record_time)
        `);

      const guestsData = (guestsDataRaw || []).filter(g => {
        let rt: string | undefined = undefined;
        if (g.record_time) {
          rt = g.record_time;
        } else if (Array.isArray(g.attendances) && g.attendances.length > 0 && g.attendances[0]?.record_time) {
          rt = g.attendances[0].record_time;
        } else if (g.attendances && typeof g.attendances === 'object' && 'record_time' in g.attendances) {
          rt = (g.attendances as { record_time: string }).record_time;
        }
        return rt && dayjs(rt).isBetween(start, end, null, '[]');
      }).sort((a, b) => {
        let aTime: string | undefined = a.record_time;
        if (!aTime) {
          if (Array.isArray(a.attendances) && a.attendances.length > 0 && a.attendances[0]?.record_time) {
            aTime = a.attendances[0].record_time;
          } else if (a.attendances && typeof a.attendances === 'object' && 'record_time' in a.attendances) {
            aTime = (a.attendances as { record_time: string }).record_time;
          }
        }
        
        let bTime: string | undefined = b.record_time;
        if (!bTime) {
          if (Array.isArray(b.attendances) && b.attendances.length > 0 && b.attendances[0]?.record_time) {
            bTime = b.attendances[0].record_time;
          } else if (b.attendances && typeof b.attendances === 'object' && 'record_time' in b.attendances) {
            bTime = (b.attendances as { record_time: string }).record_time;
          }
        }
        
        return dayjs(aTime).diff(dayjs(bTime));
      });

      if (err1 || err2) {
        setError('참여 기록을 불러오지 못했습니다.');
        setAttendance([]);
        setGuests([]);
      } else {
        setAttendance((attendances || []).map((a: any) => ({
          id: a.id,
          record_time: a.record_time,
          members: a.members ? {
            name: a.members.name,
            phone: a.members.phone,
            status: a.members.status
          } : undefined
        })));
        setGuests((guestsData || []).map((g: any) => {
          let recordTime: string | undefined = g.attendances?.record_time || g.record_time;
          return {
            id: g.id,
            guest_name: g.guest_name,
            guest_phone: g.guest_phone,
            attendances: recordTime ? { record_time: recordTime } : undefined,
            record_time: g.record_time,
          };
        }));
      }

      setLoading(false);
    };

    fetchRecords();
  }, [selectedDate, isAdmin]);

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

  if (!isAdmin) {
    return (
      <div className="max-w-screen-sm w-full mx-auto px-4 py-6">
        <div className="flex items-center space-x-2 mb-2">
          <DocumentTextIcon className="h-7 w-7 text-gray-800" />
          <h2 className="text-left text-2xl font-bold text-gray-800">참여기록 출력</h2>
        </div>
        <hr className="mb-4 border-t" />
        <div className="py-4 text-center border rounded">
          <div className="text-gray-400 mb-4">
            참여기록 조회 및 PDF 출력 기능을 사용하려면<br />
            위에서 관리자 로그인을 먼저 진행해주세요.
          </div>
        </div>
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
      record_time: g.attendances?.record_time || g.record_time || '',
    })),
  ].sort((a, b) => dayjs(a.record_time).diff(dayjs(b.record_time)));

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6 print:p-0 print:bg-white participation-log-section">
      <div className="flex items-center space-x-2 mb-2">
        <DocumentTextIcon className="h-7 w-7 text-gray-800" />
        <h2 className="text-left text-2xl font-bold text-gray-800">참여기록 출력</h2>
      </div>
      <hr className="mb-4 border-t" />
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
            <h1 className="text-center text-[1.5em] font-bold mb-4">
              피클볼클럽 [{dayjs(selectedDate).tz('Asia/Seoul').format('YYYY년 M월 D일(dddd)')}] 참여기록
            </h1>
            <hr className="mb-6 border-t" />
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm bg-white">
                <thead>
                  <tr>
                    <th className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-gray-200 text-center leading-[1.4em]">이름</th>
                    <th className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-gray-200 text-center leading-[1.4em]">휴대폰 번호</th>
                    <th className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-gray-200 text-center leading-[1.4em]">상태</th>
                    <th className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-gray-200 text-center leading-[1.4em]">기록 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 bg-white text-[1.3em] border-t border-b border-gray-300 leading-[1.4em]">
                        기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    displayData.map((rec) => (
                      <tr key={rec.id}>
                        <td className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-white text-center leading-[1.4em]">{rec.name}</td>
                        <td className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-white text-center leading-[1.4em]">
                          {rec.phone && rec.phone.length === 8
                            ? `010-${rec.phone.slice(0, 4)}-${rec.phone.slice(4)}`
                            : rec.phone || ''}
                        </td>
                        <td className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-white text-center leading-[1.4em]">{rec.status}</td>
                        <td className="border-t border-b border-gray-300 px-3 py-2 text-gray-700 text-[1.3em] bg-white text-center leading-[1.4em]">
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
                      참여 내역이 없습니다.
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
          {/* 하단 여유공간: 스크롤 시 상단으로 자동 스크롤되는 문제 방지 */}
          <div className="h-[90px]"></div>
        </>
      )}
    </div>
  );
}
