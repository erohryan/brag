import UploadForm from '../../components/UploadForm.jsx';
import LibraryBrowser from '../../components/LibraryBrowser.jsx';
import VoiceGallery from '../../components/VoiceGallery.jsx';

export const metadata = {
  title: 'Idea → promo · brag studio',
};

export default function IdeaPage() {
  return (
    <div>
      <h1>Turn an idea into a promo.</h1>
      <p className="lede">
        No site, deck, or document needed. Describe the idea — who it&apos;s for, what it
        does, what viewers should do next — and brag-idea builds an animated promo around
        one visual metaphor drawn from your own words.
      </p>
      <UploadForm mode="prompt" />

      <h2>Recent ideas</h2>
      <LibraryBrowser compact kind="idea" />

      <h2>Narration voices</h2>
      <p className="lede" style={{ marginBottom: 16 }}>
        Click any voice to hear a sample, then pick one when you turn narration on.
      </p>
      <VoiceGallery />
    </div>
  );
}
