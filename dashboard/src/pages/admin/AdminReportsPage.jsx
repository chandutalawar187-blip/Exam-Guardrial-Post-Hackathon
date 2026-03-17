import React, { useState } from 'react';
import AdminNavbar from '../../components/AdminNavbar';
import ReportsTab from '../../components/ReportsTab';
import NativeAgentReportsTab from '../../components/NativeAgentReportsTab';

const TABS = [
  { key: 'agent',  label: '🛡️ Agent Reports',       desc: 'Threats detected by student desktop agents' },
  { key: 'ai',     label: '🤖 AI Credibility',        desc: 'Forensic analysis by Agent-B (Claude)' },
];

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('agent');

  return (
    <div className="min-h-screen bg-[#BDD8E9]">
      <AdminNavbar />

      <main className="p-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-[#001D39]">Reports & Analytics</h1>
          <p className="text-[#49769F] font-body text-[14px] mt-1">
            Native agent threat log and AI-generated forensic analysis.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[#A8C8DC] rounded-xl p-1 mb-6 w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === key
                  ? 'bg-white text-[#001D39] shadow-sm'
                  : 'text-[#49769F] hover:text-[#001D39]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab subtitle */}
        <p className="text-[#49769F] text-[13px] mb-4 -mt-2">
          {TABS.find(t => t.key === activeTab)?.desc}
        </p>

        {/* Tab content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden min-h-[500px] border border-[#7BBDE8]">
          {activeTab === 'agent' && <NativeAgentReportsTab />}
          {activeTab === 'ai'    && <ReportsTab />}
        </div>
      </main>
    </div>
  );
}
