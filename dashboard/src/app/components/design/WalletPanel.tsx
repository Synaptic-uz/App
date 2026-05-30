import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { Panel, AppButton, FormField, inputClassName } from './index';

type WalletData = {
  wallet_balance: number;
  allocated_remaining: number;
  spent_total: number;
};

export function WalletPanel({ onUpdated }: { onUpdated?: () => void }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('500000');
  const [depositing, setDepositing] = useState(false);

  async function load() {
    try {
      const data = await api.getWallet();
      setWallet(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hamyon yuklanmadi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDeposit() {
    setDepositing(true);
    try {
      const data = await api.depositWallet(Number(depositAmount));
      setWallet(data);
      toast.success('Balans to‘ldirildi');
      onUpdated?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'To‘ldirish bajarilmadi');
    } finally {
      setDepositing(false);
    }
  }

  if (loading) {
    return (
      <Panel className="mb-6 flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
      </Panel>
    );
  }

  if (!wallet) return null;

  const fmt = (n: number) => `${n.toLocaleString('uz-UZ')} so‘m`;

  return (
    <Panel className="mb-6 p-5 md:p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Reklama hamyoni</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Hamyon</p>
          <p className="text-lg font-bold text-[var(--color-primary)] tabular-nums">{fmt(wallet.wallet_balance)}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Ajratilmagan</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Kampaniyalarda</p>
          <p className="text-lg font-bold tabular-nums">{fmt(wallet.allocated_remaining)}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Ishlatilmagan byudjet</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Sarflangan</p>
          <p className="text-lg font-bold tabular-nums">{fmt(wallet.spent_total)}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Bosishlar bo‘yicha</p>
        </div>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
        Kampaniya yaratishda byudjet hamyondan avtomatik ajratiladi. Byudjet tugasa reklama to‘xtaydi.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <FormField label="Test to‘ldirish (server: ALLOW_MOCK_DEPOSIT=1)">
          <input
            type="number"
            min={1000}
            step={1000}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className={inputClassName}
          />
        </FormField>
        <AppButton type="button" onClick={handleDeposit} disabled={depositing} className="gap-2 shrink-0">
          {depositing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          To‘ldirish
        </AppButton>
      </div>
    </Panel>
  );
}
