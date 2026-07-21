"use client";

import { useState } from "react";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function Header({ currentPage, onNavigate, darkMode, onToggleDarkMode, userName, userRole, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "invoice", label: "Invoice", icon: "📄" },
    { key: "quotation", label: "Quotation", icon: "📋" },
    { key: "calculate", label: "Calculate", icon: "🧮" },
    { key: "payments", label: "Payments", icon: "💰" },
    { key: "customers", label: "Customers", icon: "👥" },
    { key: "accounts", label: "Accounts", icon: "📒" },
    { key: "reports", label: "Reports", icon: "📊" },
  ];

  const moreItems = [
    { key: "history", label: "History", icon: "📜" },
    { key: "rates", label: "Rate Master", icon: "💵" },
    { key: "search", label: "Search", icon: "🔍" },
    { key: "trash", label: "Trash", icon: "🗑️" },
    { key: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <header className={`${darkMode ? "bg-gray-900" : "bg-gradient-to-r from-brand-700 to-brand-900"} text-white shadow-lg sticky top-0 z-50`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => onNavigate("dashboard")}>
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white/20 rounded-xl flex items-center justify-center text-lg lg:text-xl font-bold backdrop-blur-sm">
              L
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base lg:text-lg font-bold leading-tight">Laxmi Flex Printers</h1>
              <p className="text-[10px] lg:text-xs text-brand-200 -mt-0.5">Wardha</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentPage === item.key
                    ? "bg-white/20 text-white shadow-inner"
                    : "text-brand-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </button>
            ))}
            
            {/* More dropdown */}
            <div className="relative group">
              <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-brand-100 hover:bg-white/10 hover:text-white transition-all">
                More ▾
              </button>
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {moreItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onNavigate(item.key)}
                    className={`w-full text-left px-4 py-2 text-sm transition-all ${
                      currentPage === item.key
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-2 h-6 w-px bg-white/20" />
            <button
              onClick={onToggleDarkMode}
              className="ml-1 p-2 rounded-lg text-brand-100 hover:bg-white/10 hover:text-white transition-all"
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            {userName && (
              <div className="relative group ml-1">
                <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-brand-100 hover:bg-white/10 hover:text-white transition-all">
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">{userName.charAt(0).toUpperCase()}</div>
                  <span className="text-xs hidden xl:block">{userName}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="font-semibold text-gray-800 text-sm">{userName}</div>
                    <div className="text-xs text-gray-400 capitalize">{userRole}</div>
                  </div>
                  <button onClick={() => onNavigate("settings")} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">⚙️ Settings</button>
                  {onLogout && <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">🚪 Logout</button>}
                </div>
              </div>
            )}
          </nav>

          {/* Mobile: Quick actions + menu */}
          <div className="flex items-center gap-1 lg:hidden">
            <button
              onClick={() => onNavigate("search")}
              className="p-2 rounded-lg text-brand-100 hover:bg-white/10"
            >
              🔍
            </button>
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg text-brand-100 hover:bg-white/10"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-brand-100 hover:bg-white/10 text-lg"
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-3 border-t border-white/10 pt-2">
            <div className="grid grid-cols-3 gap-1">
              {[...navItems, ...moreItems].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    onNavigate(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    currentPage === item.key
                      ? "bg-white/20 text-white"
                      : "text-brand-100 hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}