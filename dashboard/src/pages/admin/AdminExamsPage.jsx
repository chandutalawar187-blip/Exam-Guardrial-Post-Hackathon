import React from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import DeployQuestionsPanel from '../../components/DeployQuestionsPanel';

export default function AdminExamsPage() {
  return (
    <div className="min-h-screen bg-[#BDD8E9]">
      <AdminNavbar />

      <main className="p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-[#001D39] mb-8">Exam Question Bank</h1>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6 border border-[#7BBDE8]">
          <DeployQuestionsPanel />
        </div>
      </main>
    </div>
  );
}
