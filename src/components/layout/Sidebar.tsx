'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Brain, MessageSquare, ChevronLeft, ChevronRight, X, TrendingUp } from 'lucide-react';

const sidebarItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/briefing', label: 'AI Briefing', icon: Brain },
  { href: '/ask', label: 'Ask AI', icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (
    <nav className="flex flex-1 flex-col">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 border-b border-border-subtle px-4 py-4 ${collapsed ? 'justify-center' : ''}`}>
        <TrendingUp className="h-6 w-6 shrink-0 text-accent" />
        {!collapsed && (
          <span className="text-base font-bold text-text-primary animate-fade-in">
            StockAnalytics
          </span>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 space-y-1 px-3 py-4">
        {sidebarItems.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/10 text-accent border-l-2 border-accent -ml-px'
                  : 'text-text-secondary hover:bg-active hover:text-text-primary'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-accent' : 'text-text-tertiary group-hover:text-text-primary'}`} />
              {!collapsed && <span className="animate-fade-in">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center gap-2 border-t border-border-subtle px-4 py-3 text-text-muted hover:text-text-secondary transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        {!collapsed && <span className="text-xs">Collapse</span>}
      </button>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border-subtle bg-surface transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-64 flex-col bg-surface shadow-2xl animate-slide-in-left">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 text-text-muted hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Mobile hamburger trigger — exposed via global event */}
      <button
        className="fixed bottom-4 left-4 z-40 lg:hidden flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-glow-accent"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <TrendingUp className="h-5 w-5" />
      </button>
    </>
  );
}
