import LibraryBrowser from '../../components/LibraryBrowser.jsx';

export default function LibraryPage() {
  return (
    <div>
      <h1>Library</h1>
      <p className="lede">
        Every video you&apos;ve made — from documents and from ideas. Search by title,
        prompt, filename, tone, or date, or filter by kind.
      </p>
      <LibraryBrowser />
    </div>
  );
}
