import mongoose from 'mongoose';
import { connectDB, Campaign, Event, Agent, Session } from './db.js';

async function generateFakeData() {
  console.log('Connecting to DB...');
  await connectDB();
  
  const campaigns = await Campaign.find();
  const agent = await Agent.findOne({ username: 'demo-telegram-bot' });
  
  if (campaigns.length === 0 || !agent) {
    console.log('No campaigns or agent found. Please ensure db.js seeded them.');
    process.exit(1);
  }

  // Check if we already have events
  const eventCount = await Event.countDocuments();
  if (eventCount > 0) {
    console.log(`Found ${eventCount} events. Clearing them for a fresh seed...`);
    await Event.deleteMany({});
    await Session.deleteMany({});
  }

  console.log('Generating fake events for the last 30 days...');
  const events = [];
  const sessions = [];
  
  const now = new Date();
  
  // Create 30 days of data
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // For each day, create some random events
    for (const campaign of campaigns) {
      // 50-200 impressions per campaign per day
      const dailyImpressions = Math.floor(Math.random() * 150) + 50;
      
      for (let j = 0; j < dailyImpressions; j++) {
        // Random time during that day
        const eventDate = new Date(date);
        eventDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        
        // Impression
        events.push({
          campaign_id: campaign._id,
          agent_id: agent.username,
          type: 'impression',
          createdAt: eventDate
        });
        
        // Session (related to impression)
        sessions.push({
          session_id: `ses-${Math.random().toString(36).substring(7)}`,
          user_prompt: `test prompt for ${campaign.category}`,
          intent_type: Math.random() > 0.7 ? 'hot' : (Math.random() > 0.5 ? 'warm' : 'cold'),
          intent_confidence: 0.8 + (Math.random() * 0.2),
          matched_campaign_id: campaign._id,
          similarity_score: 0.6 + (Math.random() * 0.3),
          enriched: true,
          createdAt: eventDate
        });

        // 8-15% click rate
        if (Math.random() < 0.1) {
          events.push({
            campaign_id: campaign._id,
            agent_id: agent.username,
            type: 'click',
            createdAt: eventDate
          });
          
          // Update agent and campaign totals (roughly)
          agent.total_clicks++;
          campaign.spent += campaign.cpc_rate;
          
          // 10-20% conversion rate from clicks
          if (Math.random() < 0.15) {
            events.push({
              campaign_id: campaign._id,
              agent_id: agent.username,
              type: 'conversion',
              conversion_value: Math.floor(Math.random() * 50000) + 10000,
              createdAt: eventDate
            });
          }
        }
      }
    }
  }

  console.log(`Inserting ${events.length} events...`);
  await Event.insertMany(events);
  
  console.log(`Inserting ${sessions.length} sessions...`);
  await Session.insertMany(sessions);
  
  await agent.save();
  for (const c of campaigns) {
    await c.save();
  }

  console.log('Done generating fake data!');
  process.exit(0);
}

generateFakeData().catch(console.error);
