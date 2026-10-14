'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Shown on the make-a-video pages when something required is missing.
export default function SetupBanner() {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    fetch('/api/doctor', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setSummary(d.summary))
      .catch(() => {});
  }, []);
  if (summary !== 'fail') return null;
  return (
    <div className="notice">
      <strong>Setup needs attention.</strong> Something the studio needs is missing, so videos may fail.{' '}
      <Link className="inline-link" href="/setup">
        Open Setup
      </Link>
    </div>
  );
}
