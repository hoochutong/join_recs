// src/pages/AdminPage.tsx
// 관리자 페이지 컴포넌트입니다. 회원 관리와 참여 기록 로그를 볼 수 있습니다.
import React from 'react';
import MemberAdmin from '../components/MemberAdmin';
import ParticipationLog from '../components/ParticipationLog';

// AdminPage 컴포넌트: 회원 관리와 참여 기록 로그 컴포넌트를 렌더링합니다.
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 회원 관리 컴포넌트 */}
      <MemberAdmin />
      {/* 참여 기록 로그 컴포넌트 */}
      <ParticipationLog />
    </div>
  );
}