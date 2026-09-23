import UploadForm from '../components/UploadForm.jsx';
import LibraryBrowser from '../components/LibraryBrowser.jsx';
import VoiceGallery from '../components/VoiceGallery.jsx';

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

      <h2>Try the narration voices</h2>
      <p className="lede" style={{ marginBottom: 16 }}>
        54 voices across 9 languages. Click any to hear a sample. Pick one (and a
        speed) when you turn narration on for a new video — or swap it on an
        existing one and rebuild.
      </p>
      <VoiceGallery />

      <h2>Recent</h2>
      <LibraryBrowser compact />
    </div>
  );
}
