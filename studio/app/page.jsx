import UploadForm from '../components/UploadForm.jsx';
import LibraryBrowser from '../components/LibraryBrowser.jsx';

export default function HomePage() {
  return (
    <div>
      <h1>Turn a document into a video.</h1>
      <p className="lede">
        Drop in a PDF, slide deck, or infographic. brag studio reuses its charts,
        images, and colors to build a short informational video — then keeps every
        one in a searchable library.
      </p>
      <UploadForm />
      <h2>Recent</h2>
      <LibraryBrowser compact />
    </div>
  );
}
