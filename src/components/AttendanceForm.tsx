import React, { useEffect, useState } from 'react';
// /src/components/AttendanceForm.tsx
// 참여 체크(출석) 폼을 제공하는 컴포넌트입니다.
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// AttendanceForm 컴포넌트: 참여 체크 폼과 게스트 동반 기능을 제공합니다.
export default function AttendanceForm() {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [hasGuest, setHasGuest] = useState(false);
  const [guest1Name, setGuest1Name] = useState('');
  const [guest1Phone, setGuest1Phone] = useState('');
  const [guest2Name, setGuest2Name] = useState('');
  const [guest2Phone, setGuest2Phone] = useState('');
  const [result, setResult] = useState('');

  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState(''); // 전화번호 필수 입력

  useEffect(() => {
    // 정회원, 준회원만 가져옴 (개인정보 보호를 위해 휴대폰번호 마지막 4자리만)
    supabase
      .from('members_safe')
      .select('id, name, phone_last4, status')
      .order('name', { ascending: true })
      .then(({ data }) => setMembers(data || []));
  }, []);

  const handleSubmit = async () => {
    const nowKST = dayjs().tz('Asia/Seoul');
    const todayStart = nowKST.startOf('day').utc().format();
    const todayEnd = nowKST.endOf('day').utc().format();

    if (isGuestMode) {
      if (!guestName) return alert('이름을 입력해주세요.');
      if (!guestPhone) {
        alert('휴대폰번호를 입력해주세요.');
        return;
      }

      const existingGuest = await supabase
        .from('attendance_guests')
        .select('id')
        .eq('guest_name', guestName)
        .eq('guest_phone', guestPhone)
        .gte('record_time', todayStart)
        .lte('record_time', todayEnd)
        .maybeSingle();

      if (existingGuest.data) {
        alert('오늘은 이미 참여를 완료하셨습니다.');
        return;
      }

      // 게스트 단독 insert payload 로그 추가
      console.log('게스트 단독 insert payload:', {
        guest_name: guestName,
        guest_phone: guestPhone,
        user_agent: navigator.userAgent,
        record_time: nowKST?.format?.() || dayjs().tz('Asia/Seoul').format(),
      });

      const { error: guestInsertError } = await supabase
        .from('attendance_guests')
        .insert({
          guest_name: guestName,
          guest_phone: guestPhone,
          user_agent: navigator.userAgent,
          record_time: nowKST?.format?.() || dayjs().tz('Asia/Seoul').format(),
        });

      console.log('게스트 단독 참여기록 응답:', guestInsertError ? guestInsertError : '성공');

      if (guestInsertError) {
        alert('게스트 참여 기록에 실패했습니다.');
        return;
      }

      setResult('게스트 참여가 기록되었습니다!');
    } else {
      if (!selectedMember) return alert('회원을 선택해주세요');
      const memberId = selectedMember.id;

      // 기존 출석 여부 확인 및 기록
      const existing = await supabase
        .from('attendances')
        .select('id, record_time')
        .gte('record_time', todayStart)
        .lte('record_time', todayEnd)
        .eq('member_id', memberId)
        .order('record_time', { ascending: false })
        .limit(1)
        .single();

      if (existing.data?.record_time) {
        const recordTime = dayjs(existing.data.record_time);
        if (recordTime.isBetween(dayjs(todayStart), dayjs(todayEnd), null, '[]')) {
          alert('오늘은 이미 참여를 완료하셨습니다.');
          return;
        }
      }

      const { data: attendance, error } = await supabase
        .from('attendances')
        .insert({
          member_id: memberId,
          user_agent: navigator.userAgent,
          record_time: nowKST.format()
        })
        .select()
        .single();

      if (error || !attendance) {
        alert('참여 기록에 실패했습니다.');
        return;
      }

      // 게스트 동반 정보 저장 (attendance_guests 테이블)
      if (hasGuest && attendance?.id) {
        if ((guest1Name && !guest1Phone) || (guest2Name && !guest2Phone)) {
          alert('게스트의 휴대폰번호를 입력해주세요.');
          return;
        }

        const guestInsertPayload: any[] = [];

        if (guest1Name && guest1Phone) {
          guestInsertPayload.push({
            guest_name: guest1Name,
            guest_phone: guest1Phone,
            attendance_id: attendance.id,
            record_time: nowKST.format(),
          });
        }

        if (guest2Name && guest2Phone) {
          guestInsertPayload.push({
            guest_name: guest2Name,
            guest_phone: guest2Phone,
            attendance_id: attendance.id,
            record_time: nowKST.format(),
          });
        }

        if (guestInsertPayload.length > 0) {
          console.log('게스트 insert payload:', guestInsertPayload);

          const { data: guestInsertResult, error: guestInsertError } = await supabase
            .from('attendance_guests')
            .insert(guestInsertPayload)
            .select();

          if (guestInsertError) {
            console.error('게스트 insert 에러:', guestInsertError);
            alert('게스트 정보 저장에 실패했습니다.');
          } else {
            console.log('게스트 저장 완료:', guestInsertResult);
          }
        }
      }

      setResult('참여가 정상적으로 기록되었습니다!');
    }

    setTimeout(() => {
      console.log('폼 초기화 실행');
      setSelectedMember(null);
      setHasGuest(false);
      setGuest1Name('');
      setGuest1Phone('');
      setGuest2Name('');
      setGuest2Phone('');
      setGuestName('');
      setGuestPhone('');
      setIsGuestMode(false);
      setResult('');
    }, 3000);
  };

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6 text-lg">
      {/* 게스트 체크박스 */}
      <div className="flex justify-end mb-4">
        <label
          onClick={() => {
            setIsGuestMode(!isGuestMode);
            setSelectedMember(null);
            setGuestName('');
            setGuestPhone('');
          }}
          className={`px-4 py-2 rounded-full flex items-center space-x-2 cursor-pointer font-bold text-white ${
            isGuestMode ? 'bg-black' : 'bg-[#9a9a9a]'
          }`}
        >
          <span>✓ 회원이 아닙니다</span>
        </label>
      </div>

      {/* 회원 선택 드롭다운 또는 이름 입력 필드 */}
      <div className="mb-4 flex items-center space-x-2">
        {isGuestMode ? (
          <>
            <input
              className="w-full p-3 h-[56px] border border-gray-300 rounded-xl text-xl"
              placeholder="이름을 입력하세요"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              required
            />
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              title="010을 제외한 숫자 8자리를 입력해주세요."
              className="w-full p-3 border border-gray-300 rounded-xl text-ml"
              placeholder="(010제외)휴대폰번호 8자리"
              value={guestPhone}
              onChange={e => setGuestPhone(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            <select
              className="w-full p-3 h-[56px] border border-gray-300 rounded-xl text-xl"
              value={selectedMember?.id || ''}
              onChange={e => {
                const member = members.find(m => m.id === e.target.value);
                setSelectedMember(member || null);
              }}
            >
              <option value="">회원이름 선택</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {selectedMember?.phone_last4 && (
              <span className="text-2xl font-bold text-gray-400 whitespace-nowrap ml-12">
                {selectedMember.phone_last4}
              </span>
            )}
          </>
        )}
      </div>

      {/* 게스트 동반 체크박스 */}
      {!isGuestMode && (
        <label className="flex items-center space-x-2 mb-2">
          <input type="checkbox" checked={hasGuest} onChange={e => setHasGuest(e.target.checked)} />
          <span>게스트 동반해요</span>
        </label>
      )}

      {/* 게스트 정보 입력 */}
      {hasGuest && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="font-semibold">게스트1</h4>
            <input className="w-full p-3 border rounded-lg mt-1" value={guest1Name} onChange={e => setGuest1Name(e.target.value)} placeholder="이름" />
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              title="010을 제외한 숫자 8자리를 입력해주세요."
              className="w-full p-3 border rounded-lg mt-2 text-sm"
              value={guest1Phone}
              onChange={e => setGuest1Phone(e.target.value)}
              placeholder="(010 제외)휴대폰번호 8자리"
              required
            />
          </div>
          <div>
            <h4 className="font-semibold">게스트2</h4>
            <input className="w-full p-3 border rounded-lg mt-1" value={guest2Name} onChange={e => setGuest2Name(e.target.value)} placeholder="이름" />
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              title="010을 제외한 숫자 8자리를 입력해주세요."
              className="w-full p-3 border rounded-lg mt-2 text-sm"
              value={guest2Phone}
              onChange={e => setGuest2Phone(e.target.value)}
              placeholder="(010 제외)휴대폰번호 8자리"
              required
            />
          </div>
        </div>
      )}

      {/* 참여하기 버튼 */}
      <button
        className="w-full bg-black text-white text-xl font-bold rounded-full py-3 mt-6 hover:bg-gray-900"
        onClick={handleSubmit}
      >
        참여하기
      </button>

      {/* 참여 결과 메시지 */}
      {result && <p className="text-green-600 text-center mt-4 font-semibold">{result}</p>}
    </div>
  );
}
