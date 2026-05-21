import { useState } from 'react';
import { CheckCircle2, TrendingDown, Zap, DollarSign, Users, Code, Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router'; // Make sure to use react-router for client side navigation

type ViewMode = 'business' | 'agent';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('business');

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">
            Welcome to Our Advertising Platform
          </h1>
          <p className="text-xl text-black/60 mb-8">
            Connecting businesses with AI agents for smarter, more effective advertising
          </p>

          {/* Toggle Buttons */}
          <div className="inline-flex bg-black/5 rounded-xl p-2 gap-2">
            <button
              onClick={() => setViewMode('business')}
              className={`px-8 py-3 rounded-lg transition-all ${
                viewMode === 'business'
                  ? 'bg-[#0000FF] text-white'
                  : 'bg-transparent text-black hover:bg-black/10'
              }`}
            >
              For Businesses
            </button>
            <button
              onClick={() => setViewMode('agent')}
              className={`px-8 py-3 rounded-lg transition-all ${
                viewMode === 'agent'
                  ? 'bg-[#0000FF] text-white'
                  : 'bg-transparent text-black hover:bg-black/10'
              }`}
            >
              For AI Agents
            </button>
          </div>
        </div>

        {/* Business View */}
        {viewMode === 'business' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Hero Section */}
            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-[#0000FF]/10 rounded-xl">
                  <Rocket className="w-8 h-8 text-[#0000FF]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-black">Advertise Smarter, Pay Less</h2>
                  <p className="text-black/60">Reach engaged audiences through AI-powered conversations</p>
                </div>
              </div>

              <p className="text-lg text-black/80 mb-6">
                Our platform connects your business with thousands of AI agents that interact with real users every day.
                Unlike traditional search ads, your brand appears naturally in conversations where users are actively seeking solutions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">Contextual Relevance</h3>
                    <p className="text-sm text-black/60">Your ads appear when users are actively discussing related topics</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">Higher Engagement</h3>
                    <p className="text-sm text-black/60">AI agents recommend your product naturally in conversation flow</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">Lower Costs</h3>
                    <p className="text-sm text-black/60">Pay significantly less per click and conversion than traditional ads</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-black mb-2 text-center">Platform Comparison</h2>
              <p className="text-black/60 text-center mb-8">See how we stack up against traditional advertising</p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-black/10">
                      <th className="text-left py-4 px-6 text-black font-semibold">Metric</th>
                      <th className="text-center py-4 px-6 text-black font-semibold">Google Ads</th>
                      <th className="text-center py-4 px-6 text-[#0000FF] font-semibold bg-[#0000FF]/5">Our Platform</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Average CPC (Cost Per Click)</td>
                      <td className="py-4 px-6 text-center text-black">$2.69</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$0.87</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Average CPM (Cost Per 1000 Impressions)</td>
                      <td className="py-4 px-6 text-center text-black">$38.40</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$12.50</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Average CPA (Cost Per Acquisition)</td>
                      <td className="py-4 px-6 text-center text-black">$48.96</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$18.42</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Click-Through Rate (CTR)</td>
                      <td className="py-4 px-6 text-center text-black">3.17%</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">8.94%</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Conversion Rate</td>
                      <td className="py-4 px-6 text-center text-black">4.40%</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">11.80%</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Average ROI (Return on Investment)</td>
                      <td className="py-4 px-6 text-center text-black">200%</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">436%</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Setup Time</td>
                      <td className="py-4 px-6 text-center text-black">2-3 weeks</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">24 hours</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-black font-medium">Minimum Monthly Spend</td>
                      <td className="py-4 px-6 text-center text-black">$1,000+</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$250</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-black mb-4">Ready to Transform Your Advertising?</h2>
              <p className="text-lg text-black/60 mb-6">Join thousands of businesses getting better results for less</p>
              <div className="flex gap-4 justify-center">
                <Link to="/business/analytics">
                  <button className="px-8 py-4 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors flex items-center gap-2">
                    Start Advertising
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link to="/demo">
                  <button className="px-8 py-4 bg-black/5 text-black font-medium rounded-lg hover:bg-black/10 transition-colors">
                    View Analytics Demo
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* AI Agent View */}
        {viewMode === 'agent' && (
          <div className="space-y-12 animate-fadeIn">
            {/* Hero Section */}
            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-[#0000FF]/10 rounded-xl">
                  <Code className="w-8 h-8 text-[#0000FF]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-black">Monetize Your AI Agent</h2>
                  <p className="text-black/60">Earn revenue from your users while providing value</p>
                </div>
              </div>

              <p className="text-lg text-black/80 mb-6">
                Transform your AI agent into a revenue-generating platform by integrating our advertising API.
                Display relevant, contextual ads to your users and earn money for every click and conversion.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">Easy Integration</h3>
                    <p className="text-sm text-black/60">Simple REST API that works with any tech stack</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">Contextual Matching</h3>
                    <p className="text-sm text-black/60">Our AI suggests relevant ads based on conversation context</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">Transparent Revenue</h3>
                    <p className="text-sm text-black/60">Track your earnings in real-time with detailed analytics</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-black mb-8 text-center">How It Works</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0000FF]/10 rounded-full mb-4">
                    <span className="text-2xl font-bold text-[#0000FF]">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Integrate Our API</h3>
                  <p className="text-black/60">
                    Call our lightweight REST API from your backend. It takes less than 30 minutes to set up.
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0000FF]/10 rounded-full mb-4">
                    <span className="text-2xl font-bold text-[#0000FF]">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Serve Contextual Ads</h3>
                  <p className="text-black/60">
                    Our API analyzes conversation context and returns the most relevant ads. You control when and how to display them to users.
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0000FF]/10 rounded-full mb-4">
                    <span className="text-2xl font-bold text-[#0000FF]">3</span>
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Earn Revenue</h3>
                  <p className="text-black/60">
                    Get paid for every click and conversion. Payments are processed monthly with no minimum threshold.
                  </p>
                </div>
              </div>
            </div>

            {/* API Integration Preview */}
            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-black mb-6">Quick Integration Example</h2>

              <div className="bg-black/5 rounded-lg p-6 font-mono text-sm mb-6 overflow-x-auto">
                <pre className="text-black">
{`// REST API Example for B2B Fast Query
POST https://api.synaptic.uz/authorized/send_result

{
  "prompt": "iPhone 15 narxi qancha?",
  "api_key": "sk-synaptic-demo..."
}

// Response:
{
  "match": true,
  "suggestion": "Bizda iPhone 15 uchun eng yaxshi narxlar bor. Ko'rib chiqing!",
  "tracking_url": "https://synaptic.uz/t/uzum-electronics-001"
}`}
                </pre>
              </div>
              <p className="text-black/60 mb-4">
                Our fast, low-latency API handles matching, impression tracking, and revenue attribution out-of-the-box.
              </p>
            </div>

            {/* CTA Section */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-black mb-4">Start Earning Today</h2>
              <p className="text-lg text-black/60 mb-6">Join our network of AI agents generating passive income</p>
              <div className="flex gap-4 justify-center">
                <Link to="/agent/analytics">
                  <button className="px-8 py-4 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors flex items-center gap-2">
                    Get API Access
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link to="/demo">
                  <button className="px-8 py-4 bg-black/5 text-black font-medium rounded-lg hover:bg-black/10 transition-colors">
                    View Analytics Demo
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
