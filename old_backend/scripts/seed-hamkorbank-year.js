/**
 * Hamkorbank kampaniyasi uchun 1 yillik mock impression/click eventlari.
 * Ishlatish: node scripts/seed-hamkorbank-year.js
 */
import 'dotenv/config';
import { connectDB, Campaign, Event } from '../db.js';

const DAYS = 365;
const AGENT_ID = 'demo-telegram-bot';

async function main() {
  await connectDB();

  const campaign = await Campaign.findOne({
    $or: [{ tracking_code: 'mV8rzT6DIQ' }, { name: /hamkor/i }],
  });

  if (!campaign) {
    console.error('Hamkorbank kampaniyasi topilmadi (tracking_code yoki nom bo‘yicha qidiring).');
    process.exit(1);
  }

  const deleted = await Event.deleteMany({ campaign_id: campaign._id });
  console.log(`Eski eventlar o‘chirildi: ${deleted.deletedCount}`);

  const cpc = Math.max(0, campaign.cpc_rate || 5000);
  const events = [];
  const now = new Date();
  let totalClicks = 0;
  let totalImpressions = 0;

  for (let dayOffset = DAYS; dayOffset >= 0; dayOffset--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - dayOffset);
    dayStart.setHours(0, 0, 0, 0);

    // Oxirgi oylar biroz faolroq
    const progress = (DAYS - dayOffset) / DAYS;
    const dailyImpressions = Math.floor(25 + Math.random() * 55 + progress * 40);

    for (let i = 0; i < dailyImpressions; i++) {
      const createdAt = new Date(dayStart);
      createdAt.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      events.push({
        campaign_id: campaign._id,
        agent_id: AGENT_ID,
        type: 'impression',
        createdAt,
      });
      totalImpressions++;

      // ~9% CTR, ba’zi kunlar yuqoriroq
      if (Math.random() < 0.09) {
        events.push({
          campaign_id: campaign._id,
          agent_id: AGENT_ID,
          type: 'click',
          createdAt: new Date(createdAt.getTime() + 1000),
        });
        totalClicks++;

        if (Math.random() < 0.12) {
          events.push({
            campaign_id: campaign._id,
            agent_id: AGENT_ID,
            type: 'conversion',
            conversion_value: Math.floor(500000 + Math.random() * 2000000),
            createdAt: new Date(createdAt.getTime() + 2000),
          });
        }
      }
    }
  }

  const BATCH = 8000;
  for (let i = 0; i < events.length; i += BATCH) {
    await Event.insertMany(events.slice(i, i + BATCH), { ordered: false });
    console.log(`Yozildi: ${Math.min(i + BATCH, events.length)} / ${events.length}`);
  }

  const spent = totalClicks * cpc;
  campaign.stats_impressions = totalImpressions;
  campaign.stats_clicks = totalClicks;
  campaign.spent = spent;
  await campaign.save();

  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';
  console.log('\nHamkorbank mock 1 yil tayyor:');
  console.log(`  Kampaniya: ${campaign.name} (${campaign.tracking_code})`);
  console.log(`  Ko‘rinishlar: ${totalImpressions.toLocaleString('uz-UZ')}`);
  console.log(`  Bosishlar:   ${totalClicks.toLocaleString('uz-UZ')}`);
  console.log(`  CTR:         ${ctr}%`);
  console.log(`  Sarflangan:  ${spent.toLocaleString('uz-UZ')} so‘m (CPC ${cpc})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
