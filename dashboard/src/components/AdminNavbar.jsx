import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoLight from '../assets/logo/Cognivigil_logo_full_dark.svg';

export default function AdminNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const NavLink = ({ to, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`flex items-center px-4 transition-all border-b-2 h-full ${
          isActive 
            ? 'border-[#4E8EA2] text-[#BDD8E9]' 
            : 'border-transparent text-[#49769F] hover:text-[#BDD8E9]'
        }`}
      >
        <span className="font-display font-semibold tracking-wide text-[14px]">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-[#001D39] text-white px-8 h-16 flex items-center justify-between shadow-lg sticky top-0 z-50">
      <div className="flex items-center gap-12 h-full">
        <img src={logoLight} alt="Cognivigil" className="h-8 cursor-pointer" onClick={() => navigate('/admin/dashboard')} />
        <div className="flex gap-4 h-full">
          <NavLink to="/admin/dashboard" label="Dashboard" />
          <NavLink to="/admin/create-exam" label="Create Exam" />
          <NavLink to="/admin/exams" label="Exams" />
          <NavLink to="/admin/students" label="Students" />
          <NavLink to="/admin/reports" label="Reports" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="bg-[#4E8EA2] px-3 py-1 rounded text-[10px] font-black uppercase text-white tracking-widest">124843</div>
        <button 
          onClick={() => navigate('/')} 
          className="text-[#49769F] hover:text-[#BDD8E9] transition-colors p-2 hover:bg-white/5 rounded-full"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </nav>
  );
}
