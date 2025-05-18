import React from 'react';
// /src/components/AttendanceForm.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

export default function AttendanceForm() {
  const [name, setName] = useState('');
  const [hasGuest, setHasGuest] = useState(false);
  const [guest1Name, setGuest1Name] = useState('');
  const [guest1Phone, setGuest1Phone] = useState('');
  const [guest2Name, setGuest2Name] = useState('');
  const [guest2Phone, setGuest2Phone] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return alert('이름을 입력해주세요');

    const memberRes = await supabase
      .from('members')
      .select('id, status')
      .eq('name', name.trim())
      .single();

    const todayStart = dayjs().tz('Asia/Seoul').startOf('day').toISOString();
    const todayEnd = dayjs().tz('Asia/Seoul').endOf('day').toISOString();

    // Check for duplicate member attendance
    const existingMember = await supabase
      .from('attendances')
      .select('id')
      .gte('record_time', todayStart)
      .lte('record_time', todayEnd)
      .eq('member_id', memberRes?.data?.id || 0)
      .maybeSingle();

    if (existingMember.data) {
      alert('오늘은 이미 참여를 완료하셨습니다.');
      return;
    }

    // Check for duplicate guest attendance (name match)
    const existingGuest = await supabase
      .from('attendance_guests')
      .select('id,attendances!inner(record_time)')
      .eq('guest_name', name.trim());

    const alreadyAttended = (existingGuest.data || []).some(g =>
      dayjs(g.attendances?.record_time).isBetween(todayStart, todayEnd, null, '[]')
    );

    if (alreadyAttended) {
      alert('오늘은 이미 참여를 완료하셨습니다.');
      return;
    }

    if (memberRes.error || !memberRes.data) {
      // 🔍 check if this guest participated before
      const guestExists = await supabase
        .from('attendance_guests')
        .select('id')
        .eq('guest_name', name.trim())
        .limit(1)
        .maybeSingle();

      const guestInsert = await supabase
        .from('attendances')
        .insert({
          member_id: null,
          user_agent: navigator.userAgent,
          record_time: dayjs().tz('Asia/Seoul').format()
        })
        .select()
        .single();

      if (guestInsert.error || !guestInsert.data) {
        alert('참여 기록에 실패했습니다.');
        return;
      }

      const guestData = [];
      guestData.push({
        guest_name: name.trim(),
        guest_phone: '',
        attendance_id: guestInsert.data.id
      });

      if (guest1Name) guestData.push({ guest_name: guest1Name, guest_phone: guest1Phone, attendance_id: guestInsert.data.id });
      if (guest2Name) guestData.push({ guest_name: guest2Name, guest_phone: guest2Phone, attendance_id: guestInsert.data.id });

      if (guestData.length > 0) {
        await supabase.from('attendance_guests').insert(guestData);
      }

      setResult('참여가 정상적으로 기록되었습니다!');
      setTimeout(() => {
        setName('');
        setHasGuest(false);
        setGuest1Name('');
        setGuest1Phone('');
        setGuest2Name('');
        setGuest2Phone('');
        setResult('');
      }, 3000);

      return;
    }

    const { id: memberId, status } = memberRes.data;

    if (['정지', '탈퇴'].includes(status)) {
      alert('참여가 제한된 회원입니다.');
      return;
    }

    const { data: attendance, error } = await supabase
      .from('attendances')
      .insert({
        member_id: memberId,
        user_agent: navigator.userAgent,
        record_time: dayjs().tz('Asia/Seoul').format()
      })
      .select()
      .single();

    if (error || !attendance) {
      alert('참여 기록에 실패했습니다.');
      return;
    }

    const guestData = [];
    if (guest1Name) guestData.push({ guest_name: guest1Name, guest_phone: guest1Phone, attendance_id: attendance.id });
    if (guest2Name) guestData.push({ guest_name: guest2Name, guest_phone: guest2Phone, attendance_id: attendance.id });

    if (guestData.length > 0) {
      await supabase.from('attendance_guests').insert(guestData);
    }

    setResult('참여가 정상적으로 기록되었습니다!');
    setTimeout(() => {
      setName('');
      setHasGuest(false);
      setGuest1Name('');
      setGuest1Phone('');
      setGuest2Name('');
      setGuest2Phone('');
      setResult('');
    }, 3000);
  };

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6 text-lg">
      <h2 className="text-left font-bold text-xl">참여 체크</h2>
      <hr className="mt-2 mb-6 border-t" />
      <input
        className="w-full p-3 border border-gray-300 rounded-xl mb-4 text-2xl"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="이름을 입력하세요"
      />

      <label className="flex items-center space-x-2 mb-2">
        <input type="checkbox" checked={hasGuest} onChange={e => setHasGuest(e.target.checked)} />
        <span>게스트 동반해요</span>
      </label>

      {hasGuest && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-semibold">게스트1</h4>
            <input
              className="w-full p-3 border rounded-lg mt-1"
              value={guest1Name}
              onChange={e => setGuest1Name(e.target.value)}
              placeholder="이름"
            />
            <input
              className="w-full p-3 border rounded-lg mt-2"
              value={guest1Phone}
              onChange={e => setGuest1Phone(e.target.value)}
              placeholder="휴대폰번호"
            />
          </div>
          <div>
            <h4 className="font-semibold">게스트2</h4>
            <input
              className="w-full p-3 border rounded-lg mt-1"
              value={guest2Name}
              onChange={e => setGuest2Name(e.target.value)}
              placeholder="이름"
            />
            <input
              className="w-full p-3 border rounded-lg mt-2"
              value={guest2Phone}
              onChange={e => setGuest2Phone(e.target.value)}
              placeholder="휴대폰번호"
            />
          </div>
        </div>
      )}

      <button
        className="w-full bg-black text-white text-xl font-bold rounded-full py-3 mt-6 hover:bg-gray-900"
        onClick={handleSubmit}
      >
        참여하기
      </button>

      {result && <p className="text-green-600 text-center mt-4 font-semibold">{result}</p>}

    </div>
  );
}
