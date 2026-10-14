'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const TABS = [
  { href: '/', label: '📄 Document', match: (p) => p === '/' },
  { href: '/idea', label: '✨ Idea', match: (p) => p.startsWith('/idea') },
  { href: '/library', label: 'Library', match: (p) => p.startsWith('/library') },
  { href: '/setup', label: 'Setup', match: (p) => p.startsWith('/setup'), dot: true },
];

export default function NavTabs() {
  const pathname = usePathname() || '/';
  const [health, setHealth] = useState(null);
  useEffect(() => {
    fetch('/api/doctor?quick=1', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setHealth(d.summary))
      .catch(() => {});
  }, [pathname]);
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
          {t.dot && health && health !== 'ok' && <span className={`navdot ${health}`} aria-label={`setup: ${health}`} />}
        </Link>
      ))}
    </nav>
  );
}
