// /src/App.tsx
import React from 'react';
import AttendanceForm from './components/AttendanceForm';
import MemberAdmin from './components/MemberAdmin';
import ParticipationLog from './components/ParticipationLog';

function App() {
  return (
    <div className="min-h-screen bg-white p-4 space-y-8">
      <section className="max-w-screen-sm mx-auto">
        <h2 className="text-xl font-bold text-center mb-4">참여 체크</h2>
        <AttendanceForm />
        <hr className="mt-6 border-t" />
      </section>

      <section className="max-w-screen-sm mx-auto">
        <h2 className="text-xl font-bold text-center mb-4">회원관리</h2>
        <MemberAdmin />
        <hr className="mt-6 border-t" />
      </section>

      <section className="max-w-screen-sm mx-auto">
        <h2 className="text-xl font-bold text-center mb-4">참여 기록</h2>
        <ParticipationLog />
        <hr className="mt-6 border-t" />
      </section>
    </div>
  );
}

export default App;
