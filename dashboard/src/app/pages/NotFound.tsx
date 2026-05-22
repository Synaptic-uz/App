import { uz } from '../../lib/uz';

export default function NotFound() {
  return (
    <div className="size-full bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-black mb-4">{uz.notFound.title}</h1>
        <p className="text-xl text-black/60 mb-8">{uz.notFound.message}</p>
        <div className="flex gap-4 justify-center">
          <a href="/agent/analytics" className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors">
            {uz.notFound.agentAnalytics}
          </a>
          <a href="/business/analytics" className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors">
            {uz.notFound.businessAnalytics}
          </a>
        </div>
      </div>
    </div>
  );
}
