import Link from 'next/link';
import UploadForm from '../components/UploadForm.jsx';
import LibraryBrowser from '../components/LibraryBrowser.jsx';
import VoiceGallery from '../components/VoiceGallery.jsx';

export default function DocumentPage() {
  return (
    <div>
      <h1>Turn a document into a video.</h1>
      <p className="lede">
        Drop in a PDF, slide deck, or infographic. brag-docs reuses its charts, images,
        and colors to build a short informational video. Got an idea instead of a
        document? Use the <Link href="/idea" className="inline-link">Idea tab</Link>.
      </p>
      <UploadForm mode="document" />

      <h2>Recent documents</h2>
      <LibraryBrowser compact kind="docs" />

      <h2>Narration voices</h2>
      <p className="lede" style={{ marginBottom: 16 }}>
        54 voices across 9 languages. Click any to hear a sample. Pick one (and a speed)
        when you turn narration on for a new video — or swap it on an existing one and
        rebuild.
      </p>
      <VoiceGallery />
    </div>
  );
}
