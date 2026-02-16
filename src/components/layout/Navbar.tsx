'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/briefing': 'AI Briefing',
  '/ask': 'Ask AI',
};

export default function TopBar() {
  const pathname = usePathname();

  // Build breadcrumbs
  const crumbs: { label: string; href?: string }[] = [];

  if (pathname === '/') {
    crumbs.push({ label: 'Dashboard' });
  } else if (pathname.startsWith('/holdings/')) {
    const symbol = pathname.split('/')[2]?.toUpperCase();
    crumbs.push({ label: 'Dashboard', href: '/' });
    crumbs.push({ label: symbol || 'Holding' });
  } else {
    crumbs.push({ label: 'Dashboard', href: '/' });
    crumbs.push({ label: routeLabels[pathname] || pathname.slice(1) });
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface/80 backdrop-blur-sm px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-muted" />}
            {crumb.href ? (
              <Link href={crumb.href} className="text-text-tertiary hover:text-accent transition-colors">
                {i === 0 && <Home className="mr-1 inline h-3.5 w-3.5" />}
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-text-primary">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side placeholder */}
      <div className="text-xs text-text-muted">
        StockAnalytics
      </div>
    </header>
  );
}
