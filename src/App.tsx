// /src/App.tsx
import React from 'react';
import AttendanceForm from './components/AttendanceForm';
import MemberAdmin from './components/MemberAdmin';
import ParticipationLog from './components/ParticipationLog';

function App() {
  return (
    <div className="min-h-screen bg-white p-4 space-y-8">
      <AttendanceForm />
      <MemberAdmin />
      <ParticipationLog />
    </div>
  );
}

export default App;
