import { useEffect, useState } from 'react';
import { Plus, Loader2, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { useCurrency } from '../../context/CurrencyContext';
import { Panel, AppButton, FormField, inputClassName } from './index';

type WalletData = {
	wallet_balance: number;
	allocated_remaining: number;
	spent_total: number;
	transactions?: { id: string; amount: number; type: string; created_at: string; note?: string }[];
};

const MAX_DEPOSIT = 50000000; // 50,000,000 UZS
const MIN_DEPOSIT = 10000;    // 10,000 UZS

export function WalletPanel({ onUpdated }: { onUpdated?: () => void }) {
	const { t, i18n } = useTranslation();
	const { format } = useCurrency();
	const [wallet, setWallet] = useState<WalletData | null>(null);
	const [loading, setLoading] = useState(true);
	const [depositAmount, setDepositAmount] = useState('500000');
	const [depositing, setDepositing] = useState(false);

	async function load() {
		try {
			const data = await api.getWallet();
			setWallet(data);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : t('wallet.loadError'));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
	}, []);

	async function handleDeposit() {
		const amount = Number(depositAmount);
		
		if (isNaN(amount) || amount < MIN_DEPOSIT) {
			toast.error(t('wallet.errorMinDeposit', { min: MIN_DEPOSIT.toLocaleString() }));
			return;
		}
		
		if (amount > MAX_DEPOSIT) {
			toast.error(t('wallet.errorMaxDeposit', { max: MAX_DEPOSIT.toLocaleString() }));
			return;
		}

		setDepositing(true);
		try {
			const data = await api.depositWallet(amount);
			setWallet(data);
			toast.success(t('wallet.depositSuccess'));
			onUpdated?.();
		} catch (err: unknown) {
			toast.error(
				err instanceof Error ? err.message : t('wallet.depositError')
			);
		} finally {
			setDepositing(false);
		}
	}

	if (loading) {
		return (
			<Panel className="mb-6 flex items-center justify-center py-12">
				<Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
			</Panel>
		);
	}

	if (!wallet) return null;

	if (!wallet) return null;

	return (
		<Panel className="mb-6 overflow-hidden">
			<div className="flex items-center gap-3 mb-6">
				<div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
					<Wallet className="w-5 h-5" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-[var(--color-text)]">
						{t('wallet.panelTitle')}
					</h2>
					<p className="text-xs text-[var(--color-text-secondary)]">
						{t('wallet.walletDesc').split('.')[0]}.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30 p-5 group hover:border-[var(--color-primary)] transition-colors min-w-0">
					<p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">{t('wallet.walletLabel')}</p>
					<p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums mt-2 truncate" title={wallet.wallet_balance.toString()}>
						{format(wallet.wallet_balance)}
					</p>
					<p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-70 truncate">
						{t('wallet.unallocated')}
					</p>
				</div>
				<div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30 p-5 group hover:border-[var(--color-text)] transition-colors min-w-0">
					<p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">{t('wallet.inCampaigns')}</p>
					<p className="text-2xl font-bold text-[var(--color-text)] tabular-nums mt-2 truncate" title={wallet.allocated_remaining.toString()}>
						{format(wallet.allocated_remaining)}
					</p>
					<p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-70 truncate">
						{t('wallet.unusedBudget')}
					</p>
				</div>
				<div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30 p-5 group hover:border-[var(--color-text)] transition-colors min-w-0">
					<p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">{t('wallet.spent')}</p>
					<p className="text-2xl font-bold text-[var(--color-text)] tabular-nums mt-2 truncate" title={wallet.spent_total.toString()}>
						{format(wallet.spent_total)}
					</p>
					<p className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-70 truncate">
						{t('wallet.byClicks')}
					</p>
				</div>
			</div>

			<div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
				<p className="text-sm font-semibold text-[var(--color-text)] mb-4">{t('wallet.deposit')}</p>
				<div className="flex flex-col sm:flex-row gap-4 items-end">
					<div className="flex-1 w-full">
						<FormField 
							label={t('wallet.amount')} 
							hint={t('wallet.amountHint', { max: MAX_DEPOSIT.toLocaleString() })}
						>
							<div className="relative">
								<input
									type="number"
									min={MIN_DEPOSIT}
									max={MAX_DEPOSIT}
									step={1000}
									value={depositAmount}
									onChange={(e) => setDepositAmount(e.target.value)}
									className={inputClassName}
									placeholder={MIN_DEPOSIT.toString()}
								/>
								<div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)]">
									UZS
								</div>
							</div>
						</FormField>
					</div>
					<AppButton
						type="button"
						onClick={handleDeposit}
						disabled={depositing || !depositAmount}
						className="gap-2 shrink-0 min-w-[140px]"
						size="lg"
					>
						{depositing ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Plus className="w-4 h-4" />
						)}
						{t('wallet.depositBtn')}
					</AppButton>
				</div>
				<p className="text-[10px] text-[var(--color-text-muted)] mt-3 leading-relaxed">
					{t('wallet.walletDesc')}
				</p>
			</div>

			{wallet.transactions && wallet.transactions.length > 0 && (
				<div className="mt-8">
					<h3 className="text-sm font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
						{t('wallet.history')}
					</h3>
					<div className="space-y-2">
						{wallet.transactions.map((tx) => (
							<div key={tx.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)]/20">
								<div className="flex items-center gap-3">
									<div className={cn(
										"w-2 h-2 rounded-full",
										tx.type === 'deposit' ? "bg-emerald-500" : "bg-amber-500"
									)} />
									<div>
										<p className="text-xs font-semibold text-[var(--color-text)]">
											{tx.type === 'deposit' ? t('wallet.depositType') : t('wallet.allocationType')}
										</p>
										<p className="text-[10px] text-[var(--color-text-secondary)]">
											{new Date(tx.created_at).toLocaleDateString(i18n.language)}
										</p>
									</div>
								</div>
								<p className={cn(
									"text-xs font-bold tabular-nums",
									tx.type === 'deposit' ? "text-emerald-600" : "text-amber-600"
								)}>
									{tx.type === 'deposit' ? '+' : '-'}{format(tx.amount)}
								</p>
							</div>
						))}
					</div>
				</div>
			)}
		</Panel>
	);
}
