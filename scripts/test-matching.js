/**
 * Offline matching tests. Run: node scripts/test-matching.js
 */
import { findMatchingCandidates, shouldBlockAds } from '../campaignMatcher.js';

const electronics = [
  {
    _id: '1', name: 'Tech Market', active: 1, category: 'electronics', subcategory: 'general',
    tagline: 'Telefon va noutbuklar', keywords: ['noutbuk', 'telefon'], niche_keywords: [], embedding: null,
  },
];

const universityOther = [
  {
    _id: '2', name: 'TUIT', active: 1, category: 'other', subcategory: 'custom',
    custom_category: 'University',
    tagline: 'Texnologiya universiteti — qabul ochiq',
    keywords: ['universitet', 'university', 'abituriyent', 'qabul', 'tuit'],
    niche_keywords: [], embedding: null,
  },
];

const universityEdu = [
  {
    _id: '3', name: 'Westminster', active: 1, category: 'education', subcategory: 'university',
    tagline: 'International university admissions',
    keywords: ['universitet', 'university', 'abituriyent'], niche_keywords: [], embedding: null,
  },
];

const prompt = 'qaysi universitetga topshirish mumkin?';

const blocked = shouldBlockAds(prompt, universityOther);
const { candidates, method } = await findMatchingCandidates(prompt, universityOther);

console.log('blocked:', blocked, '(expect false)');
console.log('method:', method);
console.log('winner:', candidates[0]?.campaign?.name ?? 'none');
console.log('score:', candidates[0]?.relevance?.toFixed(3) ?? 'n/a');

const edu = await findMatchingCandidates('universitet haqida malumot', universityEdu);
console.log('education category winner:', edu.candidates[0]?.campaign?.name ?? 'none');

process.exit(blocked || candidates.length === 0 ? 1 : 0);
