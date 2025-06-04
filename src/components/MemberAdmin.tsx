// import React from 'react';
// /src/components/MemberAdmin.tsx
// 회원 관리(추가, 상태 변경, 목록 조회) 기능을 제공하는 컴포넌트입니다.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PencilSquareIcon, UsersIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';

// Member 타입: 회원 정보를 나타냅니다.
interface Member {
  id: string;
  name: string;
  phone: string;
  status: string;
}

// MemberAdmin 컴포넌트: 회원 추가, 상태 변경, 목록 조회 UI를 제공합니다.
export default function MemberAdmin() {
  const navigate = useNavigate(); // 페이지 이동을 위한 navigate 함수
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState('정회원');
  // 페이지네이션 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const membersPerPage = 5; // 5명씩 표시
  
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
  const fetchMembers = async (page = 1) => {
    // 전체 회원 수 조회
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    
    if (count) setTotalMembers(count);
    
    // 페이지네이션 적용하여 조회 (최신순 정렬)
    const from = (page - 1) * membersPerPage;
    const to = from + membersPerPage - 1;
    
    const { data, error } = await supabase
      .from('members')
      .select('id, name, phone, status, created_at')
      .order('created_at', { ascending: false }) // 최신순 정렬
      .range(from, to);
    
    if (!error && data) {
      setMembers(data);
      setCurrentPage(page);
    } else {
      console.error('회원 목록 조회 오류:', error);
    }
  };

  // 관리자 로그인 함수
  const handleAdminLogin = () => {
    const password = prompt('관리자 비밀번호를 입력하세요:');
    if (password === 'pikachu1029') {
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminPassword', password);
      // 페이지 새로고침으로 모든 컴포넌트가 로그인 상태를 인식하도록 함
      window.location.reload();
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  // 관리자 로그아웃 함수 (테스트용)
  const handleAdminLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('adminPassword');
      window.location.reload(); // 페이지 새로고침
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
        fetchMembers(1); // 첫 번째 페이지로 이동
      }
    }
  };

  // 회원 상태 변경 함수
  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase.from('members').update({ status: newStatus }).eq('id', id);
    fetchMembers(currentPage); // 현재 페이지 새로고침
  };

  return (
    <div className="max-w-screen-sm w-full mx-auto px-4 py-6">
      {/* 타이틀과 참여기록 링크 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <UsersIcon className="h-7 w-7 text-gray-800" />
          <h2 className="text-2xl font-bold text-left">회원관리</h2>
        </div>
        <button
           onClick={() => navigate('/')}
           title="체크인하기" 
           className="text-gray-300 hover:text-gray-500">
          <PencilSquareIcon className="h-7 w-7" />
        </button>
      </div>
      <hr className="mt-1 mb-4 border-t" />

      {/* 관리자 로그인 상태에 따른 조건부 렌더링 */}
      {isAdmin ? (
        <>
          {/* 로그아웃 아이콘 - 작고 눈에 안띄게 */}
          <div className="flex justify-end mb-2">
            <button
              onClick={handleAdminLogout}
              title="로그아웃"
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
          
          {/* 회원 추가 입력 폼 - 관리자만 접근 가능 */}
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

          {/* 회원 목록 테이블 - 관리자만 접근 가능 */}
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
            
          {/* 페이지네이션 UI - 관리자만 접근 가능 */}
          {totalMembers > membersPerPage && (
            <div className="flex justify-center items-center mt-4 space-x-2">
              <button
                onClick={() => fetchMembers(currentPage - 1)}
                disabled={currentPage === 1}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  currentPage === 1 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <div className={`w-0 h-0 border-t-[5px] border-b-[5px] border-r-[6px] ${
                  currentPage === 1 
                  ? 'border-t-transparent border-b-transparent border-r-gray-300' 
                  : 'border-t-transparent border-b-transparent border-r-white'
                }`}></div>
              </button>
              
              <span className="px-3 py-1 text-sm">
                {currentPage} / {Math.ceil(totalMembers / membersPerPage)} 
                (총 {totalMembers}명)
              </span>
              
              <button
                onClick={() => fetchMembers(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalMembers / membersPerPage)}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  currentPage >= Math.ceil(totalMembers / membersPerPage)
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <div className={`w-0 h-0 border-t-[5px] border-b-[5px] border-l-[6px] ${
                  currentPage >= Math.ceil(totalMembers / membersPerPage)
                  ? 'border-t-transparent border-b-transparent border-l-gray-300'
                  : 'border-t-transparent border-b-transparent border-l-white'
                }`}></div>
              </button>
            </div>
          )}
        </>
      ) : (
        /* 관리자 로그인이 필요한 경우 */
        <div className="py-4 text-center border rounded">
          <div className="text-gray-400 mb-4">
          회원 관리 기능을 사용하려면 관리자 로그인이 필요합니다.
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