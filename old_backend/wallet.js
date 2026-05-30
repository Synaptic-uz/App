import mongoose from 'mongoose';
import { User, Campaign } from './db.js';

const walletTxSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['deposit', 'allocate', 'deallocate', 'spend'],
      required: true,
    },
    amount: { type: Number, required: true },
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
    balance_after: { type: Number, default: 0 },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

export const WalletTransaction =
  mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', walletTxSchema);

export function campaignBudgetRemaining(campaign) {
  const budget = Math.max(0, Number(campaign?.budget) || 0);
  const spent = Math.max(0, Number(campaign?.spent) || 0);
  if (budget <= 0) return Infinity;
  return Math.max(0, budget - spent);
}

export function hasCampaignBudgetRemaining(campaign) {
  const budget = Number(campaign?.budget) || 0;
  if (budget <= 0) return true;
  return campaignBudgetRemaining(campaign) > 0;
}

async function logTx(userId, type, amount, balanceAfter, campaignId = null, note = '') {
  await WalletTransaction.create({
    user_id: userId,
    type,
    amount,
    campaign_id: campaignId,
    balance_after: balanceAfter,
    note,
  });
}

export async function getWalletSummary(userId) {
  const user = await User.findById(userId).select('wallet_balance role').lean();
  if (!user) throw new Error('Foydalanuvchi topilmadi');

  const campaigns = await Campaign.find({ owner_id: userId })
    .select('name budget spent active')
    .lean();

  let allocated = 0;
  let spentTotal = 0;
  for (const c of campaigns) {
    allocated += Math.max(0, Number(c.budget) || 0);
    spentTotal += Math.max(0, Number(c.spent) || 0);
  }

  const wallet_balance = Math.max(0, Number(user.wallet_balance) || 0);
  let allocRemaining = 0;
  for (const c of campaigns) {
    const rem = campaignBudgetRemaining(c);
    if (rem !== Infinity) allocRemaining += rem;
  }

  return {
    wallet_balance,
    allocated_total: allocated,
    spent_total: spentTotal,
    allocated_remaining: allocRemaining,
    total_available: wallet_balance + allocRemaining,
    campaigns: campaigns.map((c) => ({
      id: c._id,
      name: c.name,
      budget: c.budget || 0,
      spent: c.spent || 0,
      remaining: campaignBudgetRemaining(c) === Infinity ? null : campaignBudgetRemaining(c),
      active: c.active,
    })),
  };
}

export async function depositWallet(userId, amount, note = '') {
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) {
    throw Object.assign(new Error('Summa musbat bo‘lishi kerak'), { status: 400 });
  }

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('Foydalanuvchi topilmadi'), { status: 404 });
  if (user.role !== 'business') {
    throw Object.assign(new Error('Faqat biznes hamyoniga to‘ldirish mumkin'), { status: 403 });
  }

  user.wallet_balance = Math.max(0, (user.wallet_balance || 0) + amt);
  await user.save();
  await logTx(userId, 'deposit', amt, user.wallet_balance, null, note || 'Balans to‘ldirildi');
  return getWalletSummary(userId);
}

export async function allocateToCampaign(userId, campaignId, amount) {
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) {
    throw Object.assign(new Error('Summa musbat bo‘lishi kerak'), { status: 400 });
  }

  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('Foydalanuvchi topilmadi'), { status: 404 });
  if ((user.wallet_balance || 0) < amt) {
    throw Object.assign(new Error('Hamyonda yetarli mablag‘ yo‘q'), { status: 400, code: 'INSUFFICIENT_FUNDS' });
  }

  const campaign = await Campaign.findOne({ _id: campaignId, owner_id: userId });
  if (!campaign) throw Object.assign(new Error('Kampaniya topilmadi'), { status: 404 });

  user.wallet_balance -= amt;
  campaign.budget = (campaign.budget || 0) + amt;
  if (campaign.active === 0 && campaignBudgetRemaining(campaign) > 0) {
    campaign.active = 1;
  }
  await user.save();
  await campaign.save();
  await logTx(userId, 'allocate', amt, user.wallet_balance, campaign._id, `${campaign.name} ga ajratildi`);
  return { wallet: await getWalletSummary(userId), campaign: { id: campaign._id, budget: campaign.budget, spent: campaign.spent } };
}

export async function deallocateFromCampaign(userId, campaignId, amount = null) {
  const campaign = await Campaign.findOne({ _id: campaignId, owner_id: userId });
  if (!campaign) throw Object.assign(new Error('Kampaniya topilmadi'), { status: 404 });

  const remaining = campaignBudgetRemaining(campaign);
  if (remaining === Infinity || remaining <= 0) {
    throw Object.assign(new Error('Qaytarish uchun bo‘sh byudjet yo‘q'), { status: 400 });
  }

  const amt = amount == null ? remaining : Math.min(Math.round(Number(amount)), remaining);
  if (!Number.isFinite(amt) || amt <= 0) {
    throw Object.assign(new Error('Noto‘g‘ri summa'), { status: 400 });
  }

  const user = await User.findById(userId);
  campaign.budget = Math.max(campaign.spent || 0, (campaign.budget || 0) - amt);
  user.wallet_balance = (user.wallet_balance || 0) + amt;

  await user.save();
  await campaign.save();
  await logTx(userId, 'deallocate', amt, user.wallet_balance, campaign._id, `${campaign.name} dan qaytarildi`);
  return { wallet: await getWalletSummary(userId), campaign: { id: campaign._id, budget: campaign.budget, spent: campaign.spent } };
}

export async function allocateOnCampaignCreate(userId, campaign, budgetAmount) {
  const amt = Math.round(Number(budgetAmount) || 0);
  if (amt <= 0) return;
  const user = await User.findById(userId);
  if ((user.wallet_balance || 0) < amt) {
    throw Object.assign(new Error('Hamyonda yetarli mablag‘ yo‘q — avval balans to‘ldiring'), {
      status: 400,
      code: 'INSUFFICIENT_FUNDS',
    });
  }
  user.wallet_balance -= amt;
  campaign.budget = amt;
  await user.save();
  await logTx(userId, 'allocate', amt, user.wallet_balance, campaign._id, `Yangi kampaniya: ${campaign.name}`);
}

export async function pauseCampaignIfBudgetExhausted(campaignId) {
  const campaign = await Campaign.findById(campaignId).select('budget spent active name').lean();
  if (!campaign) return;
  const budget = Number(campaign.budget) || 0;
  if (budget <= 0) return;
  if ((campaign.spent || 0) >= budget) {
    await Campaign.updateOne({ _id: campaignId }, { $set: { active: 0 } });
  }
}

export async function getWalletTransactions(userId, limit = 30) {
  const rows = await WalletTransaction.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.map((r) => ({
    id: r._id,
    type: r.type,
    amount: r.amount,
    balance_after: r.balance_after,
    campaign_id: r.campaign_id,
    note: r.note,
    created_at: r.createdAt,
  }));
}
