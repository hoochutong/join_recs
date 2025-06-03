// src/pages/CheckinPage.tsx
// 참여 체크(출석) 페이지 컴포넌트입니다.
import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/solid';
import AttendanceForm from '../components/AttendanceForm';

// CheckinPage 컴포넌트: 참여 체크 폼과 관리자 페이지 이동 버튼을 렌더링합니다.
export default function CheckinPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-6">
      {/* 상단 타이틀과 관리자 페이지 이동 아이콘 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[1.5rem] font-bold ml-5">피클볼클럽 참여 체크</h2>
        {/* 관리자 페이지로 이동하는 링크 */}
        <a href="/admin" title="관리자 페이지" className="text-gray-400 hover:text-gray-600">
          <Cog6ToothIcon className="h-7 w-7" />
        </a>
      </div>
      {/* 구분선 */}
      <hr className="border-t border-gray-300 mb-6" />
      {/* 참여 체크 폼 컴포넌트 */}
      <AttendanceForm />
    </div>
  );
}