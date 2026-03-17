import React from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import CreateStudentPanel from '../../components/CreateStudentPanel';

export default function AdminStudentsPage() {
  return (
    <div className="min-h-screen bg-[#BDD8E9]">
      <AdminNavbar />

      <main className="p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-[#001D39] mb-8">Candidate Authorization</h1>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#7BBDE8]">
          <CreateStudentPanel />
        </div>
      </main>
    </div>
  );
}
