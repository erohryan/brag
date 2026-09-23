import LibraryBrowser from '../../components/LibraryBrowser.jsx';

export default function LibraryPage() {
  return (
    <div>
      <h1>Library</h1>
      <p className="lede">
        Every document you&apos;ve turned into a video. Search by title, filename,
        tone, or date.
      </p>
      <LibraryBrowser />
    </div>
  );
}
