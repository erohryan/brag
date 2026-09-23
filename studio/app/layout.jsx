import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'brag studio',
  description: 'Turn documents into engaging informational videos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            brag<span>studio</span>
          </Link>
          <nav className="nav">
            <Link href="/">New</Link>
            <Link href="/library">Library</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
