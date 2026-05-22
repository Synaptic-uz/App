import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="size-full bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-black mb-4">404</h1>
        <p className="text-xl text-black/60 mb-8">Sahifa topilmadi</p>
        <div className="flex gap-4 justify-center">
          <Link to="/agent/analytics" className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors">
            Agent analitika
          </Link>
          <Link to="/business/analytics" className="px-6 py-3 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors">
            Biznes analitika
          </Link>
        </div>
      </div>
    </div>
  );
}
