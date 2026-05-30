import mongoose from 'mongoose';
import 'dotenv/config';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synaptic-ai';

const agentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  api_key_hash: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
});

const Agent = mongoose.model('Agent', agentSchema);

async function check() {
  await mongoose.connect(URI);
  const agents = await Agent.find();
  console.log('Agents in DB:', JSON.stringify(agents, null, 2));
  await mongoose.disconnect();
}

check();
