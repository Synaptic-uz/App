import { Wallet } from 'lucide-react';
import { uz } from '../../lib/uz';

type Props = {
  mainBalance: number;
  campaignCount?: number;
  className?: string;
};

export default function MainBalanceBanner({ mainBalance, campaignCount, className = '' }: Props) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border-2 border-[#0000FF]/20 bg-[#0000FF]/5 px-6 py-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#0000FF]/15 rounded-lg">
          <Wallet className="w-6 h-6 text-[#0000FF]" />
        </div>
        <div>
          <p className="text-sm text-black/60">{uz.balance.mainLabel}</p>
          <p className="text-2xl font-bold text-black">{mainBalance.toLocaleString()} {uz.common.uzs}</p>
        </div>
      </div>
      {campaignCount !== undefined && (
        <p className="text-sm text-black/50">{uz.balance.mainHint(campaignCount)}</p>
      )}
    </div>
  );
}
