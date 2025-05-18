// import React from 'react';
// /src/components/MemberAdmin.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Member {
  id: string;
  name: string;
  phone: string;
  status: string;
}

export default function MemberAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState('정회원');
  // 관리자 로그인 상태 확인
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const statusOptions = ['정회원', '준회원', '게스트', '정지', '탈퇴'];

  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
    }
  }, [isAdmin]);

  const fetchMembers = async () => {
    const { data, error } = await supabase.from('members').select();
    if (!error && data) setMembers(data);
  };

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('members').update({ status: newStatus }).eq('id', id);
    fetchMembers();
  };

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6">

      <h2 className="text-lg font-bold text-left">회원관리</h2>
      <hr className="mt-1 mb-4 border-t" />

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
        <div className="py-4 text-center text-gray-500 border rounded">
          회원 목록을 보려면 관리자 로그인이 필요합니다.
        </div>
      )}
    </div>
  );
}
