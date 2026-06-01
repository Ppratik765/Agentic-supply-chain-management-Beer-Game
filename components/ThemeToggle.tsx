'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sync state with DOM on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className="p-2.5 rounded-full glass-card flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 border border-[var(--border-glow)] shadow-md"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sun Icon */}
        <Sun
          className={`absolute transition-all duration-500 transform ${
            theme === 'light'
              ? 'rotate-0 scale-100 text-[#b45309]'
              : '-rotate-90 scale-0 text-[var(--text-primary)]'
          }`}
          size={20}
        />
        {/* Moon Icon */}
        <Moon
          className={`absolute transition-all duration-500 transform ${
            theme === 'dark'
              ? 'rotate-0 scale-100 text-[#a78bfa]'
              : 'rotate-90 scale-0 text-[var(--text-primary)]'
          }`}
          size={20}
        />
      </div>
    </button>
  );
}
