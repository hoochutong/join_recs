// src/pages/AdminPage.tsx
import React from 'react';
import MemberAdmin from '../components/MemberAdmin';
import ParticipationLog from '../components/ParticipationLog';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-white">
      <MemberAdmin />
      <ParticipationLog />
    </div>
  );
}