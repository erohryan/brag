import './globals.css';
import Link from 'next/link';
import NavTabs from '../components/NavTabs.jsx';

export const metadata = {
  title: 'brag studio',
  description: 'Turn documents and ideas into engaging videos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            brag<span>studio</span>
          </Link>
          <NavTabs />
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
