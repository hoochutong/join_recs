import React, { useEffect, useState } from 'react';
// /src/components/AttendanceForm.tsx
// 참여 체크(출석) 폼을 제공하는 컴포넌트입니다.
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// AttendanceForm 컴포넌트: 참여 체크 폼과 게스트 동반 기능을 제공합니다.
export default function AttendanceForm() {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  // 자동완성 기능을 위한 새로운 상태들
  const [memberInput, setMemberInput] = useState(''); // 회원 이름 입력 필드값
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]); // 필터링된 회원 목록
  const [showMemberList, setShowMemberList] = useState(false); // 회원 목록 표시 여부
  const [selectedIndex, setSelectedIndex] = useState(-1); // 키보드 네비게이션용 인덱스
  
  const [hasGuest, setHasGuest] = useState(false);
  const [guest1Name, setGuest1Name] = useState('');
  const [guest1Phone, setGuest1Phone] = useState('');
  const [guest2Name, setGuest2Name] = useState('');
  const [guest2Phone, setGuest2Phone] = useState('');
  const [result, setResult] = useState('');

  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState(''); // 전화번호 필수 입력
  const [showToast, setShowToast] = useState(false); // 토스트 알림 표시 여부

  useEffect(() => {
    // 정회원, 준회원만 가져옴 (임시로 기존 방식 사용)
    supabase
      .from('members')
      .select('id, name, phone, status')
      .in('status', ['정회원', '준회원'])
      .order('name', { ascending: true })
      .then(({ data }) => {
        // 개인정보 보호를 위해 클라이언트에서 휴대폰번호 마지막 4자리만 표시
        const safeData = (data || []).map(member => ({
          ...member,
          phone_last4: member.phone && member.phone.length >= 4 ? member.phone.slice(-4) : ''
        }));
        setMembers(safeData);
      });
  }, []);

  // 회원 이름 입력값이 변경될 때 필터링 수행
  const handleMemberInputChange = (value: string) => {
    setMemberInput(value);
    setSelectedIndex(-1);
    
    if (value.trim() === '') {
      setFilteredMembers([]);
      setShowMemberList(false);
      setSelectedMember(null);
      return;
    }

    // 입력값으로 회원 이름 필터링 (한글 자모음 부분 매칭도 고려)
    const filtered = members.filter(member => 
      member.name.toLowerCase().includes(value.toLowerCase()) ||
      member.name.includes(value)
    );
    
    setFilteredMembers(filtered);
    setShowMemberList(filtered.length > 0);
    
    // 정확히 일치하는 회원이 있으면 자동 선택
    const exactMatch = filtered.find(member => member.name === value);
    if (exactMatch) {
      setSelectedMember(exactMatch);
    } else {
      setSelectedMember(null);
    }
  };

  // 회원 선택 처리
  const handleMemberSelect = (member: any) => {
    setSelectedMember(member);
    setMemberInput(member.name);
    setShowMemberList(false);
    setSelectedIndex(-1);
  };

  // 키보드 네비게이션 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMemberList || filteredMembers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredMembers.length) {
          handleMemberSelect(filteredMembers[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowMemberList(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSubmit = async () => {
    const nowKST = dayjs().tz('Asia/Seoul');
    // 수정: KST 기준으로 오늘 범위를 계산하고 UTC로 변환
    const todayStart = nowKST.startOf('day').format();
    const todayEnd = nowKST.endOf('day').format();
    
    // 디버깅: 시간대 정보 출력
    console.log('현재 KST 시간:', nowKST.format());
    console.log('오늘 시작 (KST):', todayStart);
    console.log('오늘 끝 (KST):', todayEnd);

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

      if (existingGuest.error) {
        console.error('게스트 중복 체크 중 오류:', existingGuest.error);
        alert('시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      if (existingGuest.data) {
        alert('오늘은 이미 참여를 완료하셨습니다.');
        return;
      }

      const { error: guestInsertError } = await supabase
        .from('attendance_guests')
        .insert({
          guest_name: guestName,
          guest_phone: guestPhone,
          user_agent: navigator.userAgent,
          record_time: nowKST?.format?.() || dayjs().tz('Asia/Seoul').format(),
        });

      if (guestInsertError) {
        alert('게스트 참여 기록에 실패했습니다.');
        return;
      }

      setResult('운동 출석체크를 완료했어요 🤗');
      setShowToast(true); // 토스트 알림 표시
    } else {
      if (!selectedMember) return alert('회원을 선택해주세요');
      const memberId = selectedMember.id;

      // 기존 출석 여부 확인 및 기록
      console.log('회원 중복 체크 시작 - memberId:', memberId);
      const existing = await supabase
        .from('attendances')
        .select('id, record_time')
        .gte('record_time', todayStart)
        .lte('record_time', todayEnd)
        .eq('member_id', memberId);

      console.log('중복 체크 결과:', existing);

      if (existing.error) {
        console.error('중복 체크 중 오류:', existing.error);
        alert('시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      if (existing.data && existing.data.length > 0) {
        console.log('중복 발견! 기존 기록:', existing.data);
        alert('오늘은 이미 참여를 완료하셨습니다.');
        return;
      }
      
      console.log('중복 없음, 참여 기록 진행');

      // 게스트 동반 시 게스트 중복 체크 먼저 수행
      if (hasGuest) {
        if ((guest1Name && !guest1Phone) || (guest2Name && !guest2Phone)) {
          alert('게스트의 휴대폰번호를 입력해주세요.');
          return;
        }

        const guestsToCheck: { name: string; phone: string; label: string; }[] = [];
        if (guest1Name && guest1Phone) {
          guestsToCheck.push({ name: guest1Name, phone: guest1Phone, label: '게스트1' });
        }
        if (guest2Name && guest2Phone) {
          guestsToCheck.push({ name: guest2Name, phone: guest2Phone, label: '게스트2' });
        }

        // 각 게스트의 중복 체크
        for (const guest of guestsToCheck) {
          const existingGuest = await supabase
            .from('attendance_guests')
            .select('id')
            .eq('guest_name', guest.name)
            .eq('guest_phone', guest.phone)
            .gte('record_time', todayStart)
            .lte('record_time', todayEnd)
            .maybeSingle();

          if (existingGuest.error) {
            console.error('게스트 중복 체크 중 오류:', existingGuest.error);
            alert('시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            return;
          }

          if (existingGuest.data) {
            alert(`${guest.label}(${guest.name})님은 오늘 이미 참여를 완료하셨습니다.`);
            return;
          }
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
          const { data: guestInsertResult, error: guestInsertError } = await supabase
            .from('attendance_guests')
            .insert(guestInsertPayload)
            .select();

          if (guestInsertError) {
            alert('게스트 정보 저장에 실패했습니다.');
          }
        }
      }

      setResult('운동 출석체크를 완료했어요 🤗');
      setShowToast(true); // 토스트 알림 표시
    }

    setTimeout(() => {
      setSelectedMember(null);
      setMemberInput(''); // 회원 입력 필드도 초기화
      setFilteredMembers([]); // 필터링된 목록도 초기화
      setShowMemberList(false); // 회원 목록 숨김
      setSelectedIndex(-1); // 선택 인덱스 초기화
      setHasGuest(false);
      setGuest1Name('');
      setGuest1Phone('');
      setGuest2Name('');
      setGuest2Phone('');
      setGuestName('');
      setGuestPhone('');
      setIsGuestMode(false);
      setResult('');
      setShowToast(false); // 토스트 알림 숨김
    }, 3000);
  };

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6 text-lg attendance-form-section relative">
      {/* 토스트 알림: 성공 메시지 */}
      {showToast && result && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 
                        bg-green-500 text-white px-8 py-6 rounded-xl shadow-2xl 
                        flex flex-col items-center space-y-3 animate-slide-down
                        min-w-[320px] max-w-[90vw]">
          <CheckCircleIcon className="h-10 w-10 flex-shrink-0 border-2 border-white rounded-full" />
          <span className="text-lg font-bold text-center break-words">
            {result}
          </span>
        </div>
      )}
      {/* 회원 자동완성 입력 필드 또는 게스트 이름 입력 필드 */}
      <div className="mb-4 flex items-center space-x-2 relative">
        {isGuestMode ? (
          <>
            <input
              className="w-full p-3 h-[56px] border border-gray-300 rounded-xl text-xl"
              placeholder="본명을 입력하세요"
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
              className="w-full p-3 border border-gray-200 rounded-xl text-ml"
              placeholder="(010제외)휴대폰번호 8자리"
              value={guestPhone}
              onChange={e => setGuestPhone(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            {/* 회원 자동완성 입력 필드 */}
            <div className="relative w-full">
              <input
                className="w-full p-3 h-[56px] border border-gray-200 rounded-xl text-xl"
                placeholder="'성'을 입력하고, 내 이름을 선택하세요"
                value={memberInput}
                onChange={e => handleMemberInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (filteredMembers.length > 0) {
                    setShowMemberList(true);
                  }
                }}
                onBlur={() => {
                  // 잠시 지연 후 목록 숨김 (클릭 이벤트가 먼저 처리되도록)
                  setTimeout(() => setShowMemberList(false), 200);
                }}
                autoComplete="off"
              />
              
              {/* 자동완성 드롭다운 목록 */}
              {showMemberList && filteredMembers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredMembers.map((member, index) => (
                    <div
                      key={member.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center ${
                        index === selectedIndex ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => handleMemberSelect(member)}
                    >
                      <span className="font-medium">{member.name}</span>
                      {member.phone_last4 && (
                        <span className="text-sm text-gray-400">{member.phone_last4}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 선택된 회원의 전화번호 표시 */}
            {selectedMember?.phone_last4 && (
              <span className="text-2xl font-bold text-gray-300 whitespace-nowrap ml-12">
                {selectedMember.phone_last4}
              </span>
            )}
          </>
        )}
      </div>

      {/* 게스트 동반 체크박스와 회원이 아닙니다 버튼을 같은 라인에 배치 */}
      <div className="flex items-center justify-between mb-2">
        {/* 게스트 동반 체크박스는 회원 모드일 때만 표시 */}
        {!isGuestMode && (
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={hasGuest} onChange={e => setHasGuest(e.target.checked)} />
            <span>게스트와 함께 해요</span>
          </label>
        )}
        
        {/* 게스트 모드일 때는 빈 공간을 위해 div 추가 */}
        {isGuestMode && <div></div>}
        
        {/* 회원이 아닙니다/회원입니다 버튼을 항상 표시 */}
        <label
          onClick={() => {
            setIsGuestMode(!isGuestMode);
            setSelectedMember(null);
            setMemberInput(''); // 회원 입력 필드 초기화
            setFilteredMembers([]); // 필터링된 목록 초기화
            setShowMemberList(false); // 회원 목록 숨김
            setSelectedIndex(-1); // 선택 인덱스 초기화
            setGuestName('');
            setGuestPhone('');
            // 게스트 모드에서 회원 모드로 전환시 게스트 동반 해제
            setHasGuest(false);
          }}
          className={`w-32 px-2 py-1 rounded-full flex items-center justify-center space-x-1 cursor-pointer text-sm font-medium text-white ${
            isGuestMode ? 'bg-black' : 'bg-[#9a9a9a]'
          }`}
        >
          <span>{isGuestMode ? '✓ 회원입니다' : '✓ 회원이 아닙니다'}</span>
        </label>
      </div>

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

    </div>
  );
}
