// import React from 'react';
// /src/components/MemberAdmin.tsx
// 회원 관리(추가, 상태 변경, 목록 조회) 기능을 제공하는 컴포넌트입니다.
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Member 타입: 회원 정보를 나타냅니다.
interface Member {
  id: string;
  name: string;
  phone: string;
  status: string;
}

// MemberAdmin 컴포넌트: 회원 추가, 상태 변경, 목록 조회 UI를 제공합니다.
export default function MemberAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState('정회원');
  // 관리자 로그인 상태 확인 및 비밀번호 저장
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // 회원 상태 옵션 목록
  const statusOptions = ['정회원', '준회원', '게스트', '정지', '탈퇴'];

  // 컴포넌트 마운트 시 회원 목록을 불러옵니다.
  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
    }
  }, [isAdmin]);

  // 회원 목록을 Supabase에서 조회하는 함수 (관리자용 - 전체 정보 포함)
  const fetchMembers = async () => {
    const adminPassword = localStorage.getItem('adminPassword') || 'pikachu1029';
    const { data, error } = await supabase.rpc('get_members_admin_simple', {
      admin_pass: adminPassword
    });
    if (!error && data) setMembers(data);
  };

  // 관리자 로그인 함수
  const handleAdminLogin = () => {
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (password === 'pikachu1029') {
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminPassword', password);
      fetchMembers();
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  // 회원 추가 함수
  const handleAdd = async () => {
    if (!newName || newPhone.length !== 8) {
      alert('이름과 8자리 휴대폰번호를 입력해주세요');
      return;
    }
    const { error } = await supabase.from('members').insert({
      name: newName,
      phone: newPhone,
      status: newStatus
    });
    if (!error) {
      setNewName('');
      setNewPhone('');
      setNewStatus('정회원');
      if (isAdmin) {
        fetchMembers();
      }
    }
  };

  // 회원 상태 변경 함수
  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('members').update({ status: newStatus }).eq('id', id);
    fetchMembers();
  };

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6">

      <h2 className="text-xl font-bold text-left">회원관리</h2>
      <hr className="mt-1 mb-4 border-t" />

      {/* 회원 추가 입력 폼 */}
      <div className="space-y-2 mb-10">
        <input
          className="w-full p-2 border rounded"
          placeholder="이름"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          type="tel"
          inputMode="numeric"
          placeholder="휴대폰번호 8자리"
          value={newPhone}
          onChange={e => setNewPhone(e.target.value)}
        />
        <select
          className="w-full p-2 border rounded"
          value={newStatus}
          onChange={e => setNewStatus(e.target.value)}
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <button
          className="w-full bg-black text-white font-bold text-lg p-2 rounded-full hover:bg-gray-800"
          onClick={handleAdd}
        >
          회원 추가하기
        </button>
      </div>

      {/* 회원 목록 테이블 (관리자만 볼 수 있음) */}
      {isAdmin ? (
        <table className="w-full text-left border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">이름</th>
              <th className="p-2">휴대폰번호</th>
              <th className="p-2">상태</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id} className="border-t">
                <td className="p-2">{member.name}</td>
                <td className="p-2">
                  {member.phone && /^\d{8}$/.test(member.phone)
                    ? `010-${member.phone.slice(0, 4)}-${member.phone.slice(4)}`
                    : member.phone}
                </td>
                <td className="p-2">
                  <select
                    value={member.status}
                    onChange={e => handleStatusChange(member.id, e.target.value)}
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-4 text-center border rounded">
          <div className="text-gray-500 mb-4">
            회원 목록을 보려면 관리자 로그인이 필요합니다.
          </div>
          <button
            onClick={handleAdminLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            관리자 로그인
          </button>
        </div>
      )}
    </div>
  );
}
