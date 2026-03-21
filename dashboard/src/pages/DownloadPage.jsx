// dashboard/src/pages/DownloadPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Direct download via our backend API — no GitHub redirect
const API_BASE = import.meta.env.VITE_API_URL || '';
const RELEASE_TAG = 'v1.5.2';
const DOWNLOADS = {
  windows: `${API_BASE}/api/downloads/windows`,
  macos: `${API_BASE}/api/downloads/macos`,
  linux: `${API_BASE}/api/downloads/linux`,
};

const FEATURES = [
  { icon: '🔍', title: 'AI Agent Detection', desc: 'Scans for ChatGPT, Copilot, and 50+ AI tools in real-time.' },
  { icon: '🛡️', title: 'Active Blocking', desc: 'Automatically terminates prohibited processes during exams.' },
  { icon: '📡', title: 'Live Monitoring', desc: 'Sends heartbeats and findings to your admin dashboard instantly.' },
  { icon: '🌐', title: 'Universal Compatibility', desc: 'Works with HackerRank, LeetCode, or any exam platform via link.' },
  { icon: '📊', title: 'Integrity Reports', desc: 'Auto-generates credibility reports with scoring and evidence.' },
  { icon: '🔒', title: 'Zero Data Collection', desc: 'No personal data stored. Fully reversible after the exam ends.' },
];

const OS_CARDS = [
  {
    id: 'windows',
    name: 'Windows',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
      </svg>
    ),
    file: 'ExamGuardrailSetup.exe',
    size: '~95 MB',
    instructions: 'Double-click to install. Setup wizard guides you through.',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    file: 'ExamGuardrailSetup-macOS.dmg',
    size: '~90 MB',
    instructions: 'Open the DMG and drag to Applications.',
    gradient: 'from-gray-500 to-gray-300',
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M20.581 19.049c-.55-.446-.336-1.431-.907-1.917.553-3.365-.997-6.331-2.845-8.232-1.551-1.595-1.717-3.063-1.041-5.108.465-1.404-.376-2.18-1.092-1.837-.792.381-1.357 1.481-1.635 2.404-.656 2.183-.164 3.79.896 5.322 1.066 1.541 1.964 3.781 1.731 6.574-.047.571.049 1.146.228 1.679.193.576.476 1.136.853 1.573.207.243.5.439.813.571-1.013.422-2.459.644-4.058.644-1.621 0-3.069-.224-4.074-.65.282-.119.546-.282.754-.493.442-.451.74-1.065.924-1.651.187-.593.26-1.175.238-1.684-.081-1.793.221-3.512.73-4.793.466-1.173 1.104-2.024 1.71-2.86.59-.814.982-1.573 1.14-2.548.213-1.323-.035-2.822-.627-3.813-.335-.559-.858-.824-1.339-.632-.603.242-.952 1.051-1.031 1.859-.072.737.044 1.493.377 2.097.449.814.487 1.652.072 2.711-.537 1.37-1.322 2.632-1.915 4.14-.53 1.354-.822 3.011-.755 4.843.027.726.129 1.414.342 2.04.164.478.396.924.702 1.302.16.198.348.374.558.519-1.06.225-2.271.35-3.577.35-2.236 0-4.147-.526-5.231-1.416-.34-.28-.532-.612-.541-.973-.009-.377.167-.793.52-1.217.353-.424.53-.93.443-1.432-.087-.502-.424-.967-.918-1.157-.488-.19-1.042-.078-1.451.292-.515.465-.841 1.151-.856 1.892-.015.729.247 1.513.81 2.167 1.298 1.508 3.638 2.344 6.568 2.344 5.534 0 9.28-2.069 9.924-3.566l.107-.217c.074-.152.126-.297.163-.439.012-.047.02-.094.027-.14.002-.015.004-.028.005-.042l.005-.04c.012-.108.014-.217.005-.326z"/>
      </svg>
    ),
    file: 'ExamGuardrailSetup-Linux.deb',
    size: '~85 MB',
    instructions: 'Run: sudo dpkg -i ExamGuardrailSetup-Linux.deb',
    gradient: 'from-amber-500 to-orange-400',
  },
];

export default function DownloadPage() {
  const [activeOS, setActiveOS] = useState('windows');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#001D39] text-white font-body overflow-x-hidden relative">
      {/* ─── Animated Background ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Moving gradient orbs */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-[120px] transition-transform duration-[3000ms]"
          style={{
            background: 'radial-gradient(circle, #4E8EA2 0%, transparent 70%)',
            left: `${mousePos.x * 0.05 - 100}px`,
            top: `${mousePos.y * 0.05 - 100}px`,
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #7BBDE8 0%, transparent 70%)',
            right: '10%',
            bottom: `${20 + scrollY * 0.05}%`,
          }}
        />
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 animate-float"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${Math.random() * 10 + 8}s`,
            }}
          />
        ))}
      </div>

      {/* ─── Nav Bar (Glass) ─── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#001D39]/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4E8EA2] to-[#7BBDE8] flex items-center justify-center font-bold text-lg shadow-lg shadow-[#4E8EA2]/30 group-hover:scale-110 transition-transform duration-300">
              G
            </div>
            <span className="text-xl font-bold tracking-tight">
              Exam<span className="text-[#7BBDE8]">Guardrail</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#7BBDE8] border border-[#7BBDE8]/30 hover:bg-[#7BBDE8]/10 transition-all duration-300"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 text-sm text-[#7BBDE8] tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Version {RELEASE_TAG} — Available Now
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
          <span className="bg-gradient-to-r from-white via-[#BDD8E9] to-[#7BBDE8] bg-clip-text text-transparent">
            Protect Exam
          </span>
          <br />
          <span className="bg-gradient-to-r from-[#4E8EA2] to-[#7BBDE8] bg-clip-text text-transparent">
            Integrity. Everywhere.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-[#BDD8E9]/80 mb-12 leading-relaxed">
          The AI-powered desktop agent that monitors exams for cheating tools, blocks prohibited processes,
          and delivers real-time credibility reports — all from a single lightweight app.
        </p>

        {/* Quick Download Button */}
        <a
          href={DOWNLOADS[activeOS]}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#4E8EA2] to-[#7BBDE8] text-white font-bold text-lg shadow-2xl shadow-[#4E8EA2]/40 hover:shadow-[#4E8EA2]/60 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download for {OS_CARDS.find(c => c.id === activeOS)?.name}
        </a>
        <p className="text-sm text-[#49769F] mt-3">
          {OS_CARDS.find(c => c.id === activeOS)?.file} • {OS_CARDS.find(c => c.id === activeOS)?.size}
        </p>
      </section>

      {/* ─── OS Selector Cards ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {OS_CARDS.map((os) => (
            <button
              key={os.id}
              onClick={() => setActiveOS(os.id)}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 cursor-pointer
                ${activeOS === os.id
                  ? 'bg-white/10 border-2 border-[#7BBDE8]/60 shadow-xl shadow-[#4E8EA2]/20 scale-[1.03]'
                  : 'bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20'
                }`}
            >
              {/* Glass morph background glow */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 bg-gradient-to-br ${os.gradient}`} />

              <div className={`mb-4 w-10 h-10 transition-all duration-300 ${activeOS === os.id ? 'text-[#7BBDE8]' : 'text-[#49769F]'}`}>
                {os.icon}
              </div>
              <h3 className="text-xl font-bold mb-1">{os.name}</h3>
              <p className="text-sm text-[#BDD8E9]/60 mb-3">{os.file}</p>
              <p className="text-xs text-[#49769F]">{os.instructions}</p>

              {activeOS === os.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <a
                    href={DOWNLOADS[os.id]}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${os.gradient} shadow-lg hover:scale-105 active:scale-95 transition-all duration-300`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download {os.size}
                  </a>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          Why <span className="text-[#7BBDE8]">ExamGuardrail</span>?
        </h2>
        <p className="text-center text-[#BDD8E9]/60 mb-12 max-w-xl mx-auto">
          A single lightweight agent provides enterprise-grade exam protection.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => (
            <div
              key={i}
              className="group relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-[#4E8EA2]/40 hover:shadow-xl hover:shadow-[#4E8EA2]/10 transition-all duration-500 hover:-translate-y-1"
            >
              {/* Morph glow on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-[#4E8EA2]/10 to-transparent pointer-events-none" />

              <div className="text-3xl mb-4">{feat.icon}</div>
              <h3 className="text-lg font-bold mb-2 text-white">{feat.title}</h3>
              <p className="text-sm text-[#BDD8E9]/60 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          How It <span className="text-[#7BBDE8]">Works</span>
        </h2>
        <div className="flex flex-col md:flex-row gap-0 md:gap-0 items-stretch">
          {[
            { step: '01', title: 'Download & Install', desc: 'Students download the agent from this page and run the setup wizard.', color: 'from-blue-500 to-cyan-400' },
            { step: '02', title: 'Enter Session Code', desc: 'Paste the exam link or session code from your instructor.', color: 'from-teal-500 to-emerald-400' },
            { step: '03', title: 'Auto-Monitor', desc: 'The agent runs silently, scanning for AI tools and reporting findings.', color: 'from-emerald-500 to-green-400' },
          ].map((item, i) => (
            <div key={i} className="flex-1 relative group">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-all duration-500 mx-2 h-full">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} text-white font-extrabold text-xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[#BDD8E9]/60">{item.desc}</p>
              </div>
              {i < 2 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 z-20 items-center justify-center text-[#4E8EA2]/40">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A2A4A] to-[#001D39] border border-white/10 p-12 text-center">
          {/* Glass decoration */}
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-[#4E8EA2]/20 blur-[80px]" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-[#7BBDE8]/20 blur-[80px]" />

          <h2 className="relative text-3xl md:text-4xl font-extrabold mb-4">
            Ready to secure your exams?
          </h2>
          <p className="relative text-[#BDD8E9]/70 mb-8 max-w-lg mx-auto">
            Download ExamGuardrail now and start monitoring in under 2 minutes.
          </p>
          <div className="relative flex flex-wrap justify-center gap-4">
            {OS_CARDS.map((os) => (
              <a
                key={os.id}
                href={DOWNLOADS[os.id]}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border transition-all duration-300 hover:scale-105
                  ${os.id === 'windows'
                    ? 'bg-white text-[#001D39] border-white shadow-xl'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                  }`}
              >
                <span className="w-5 h-5 flex items-center justify-center">{os.icon}</span>
                {os.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#49769F]">© 2026 ExamGuardrail — Cognivigil Secure Exam Platform</p>
          <div className="flex items-center gap-6 text-sm text-[#49769F]">
            <Link to="/" className="hover:text-[#7BBDE8] transition-colors">Login</Link>
            <a href="https://github.com/chandutalawar187/Exam-Guardrial-Post-Hackathon" target="_blank" rel="noopener noreferrer" className="hover:text-[#7BBDE8] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>

      {/* ─── Custom CSS Animations ─── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          25% { transform: translateY(-20px) rotate(5deg); opacity: 0.6; }
          50% { transform: translateY(-35px) rotate(0deg); opacity: 0.4; }
          75% { transform: translateY(-15px) rotate(-5deg); opacity: 0.7; }
        }
        .animate-float { animation: float 12s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
