import { Helmet } from 'react-helmet-async';
import { LandingPage } from '../components/landing/LandingPage';

export default function Home() {
  return (
    <div
      className="synaptic-scroll flex-1 min-h-0 overflow-auto bg-[var(--color-bg)] pb-28 lg:pb-0"
      data-scrollable="true"
    >
      <Helmet>
        <title>Synaptic — AI-Native Ad Protocol | O‘zbekistonda AI reklama</title>
        <meta
          name="description"
          content="Synaptic — generativ AI va chat-botlar uchun nativ reklama protokoli. Kontekstli embedding, <150ms latency, RevShare agentlar uchun 60%."
        />
      </Helmet>
      <LandingPage />
    </div>
  );
}
