// src/pages/CheckinPage.tsx
import { Cog6ToothIcon } from '@heroicons/react/24/solid';
import AttendanceForm from '../components/AttendanceForm';

export default function CheckinPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[1.5rem] font-bold ml-4">피클볼클럽 참여 체크</h2>
        <a href="/admin" title="관리자 페이지" className="text-gray-200 hover:text-gray-500">
          <Cog6ToothIcon className="h-6 w-6" />
        </a>
      </div>
      <hr className="border-t border-gray-300 mb-6" />
      <AttendanceForm />
    </div>
  );
}