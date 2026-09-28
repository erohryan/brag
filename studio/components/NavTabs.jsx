'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: '📄 Document', match: (p) => p === '/' },
  { href: '/idea', label: '✨ Idea', match: (p) => p.startsWith('/idea') },
  { href: '/library', label: 'Library', match: (p) => p.startsWith('/library') },
];

export default function NavTabs() {
  const pathname = usePathname() || '/';
  return (
    <nav className="nav">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={t.match(pathname) ? 'active' : ''}
          aria-current={t.match(pathname) ? 'page' : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
