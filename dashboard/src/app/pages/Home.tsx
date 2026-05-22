import { useState } from 'react';
import { CheckCircle2, Code, Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { uz } from '../../lib/uz';

type ViewMode = 'business' | 'agent';

const h = uz.home;

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('business');

  return (
    <div className="size-full bg-white overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">{h.welcome}</h1>
          <p className="text-xl text-black/60 mb-8">{h.subtitle}</p>

          <div className="inline-flex bg-black/5 rounded-xl p-2 gap-2">
            <button
              onClick={() => setViewMode('business')}
              className={`px-8 py-3 rounded-lg transition-all ${
                viewMode === 'business'
                  ? 'bg-[#0000FF] text-white'
                  : 'bg-transparent text-black hover:bg-black/10'
              }`}
            >
              {h.forBusiness}
            </button>
            <button
              onClick={() => setViewMode('agent')}
              className={`px-8 py-3 rounded-lg transition-all ${
                viewMode === 'agent'
                  ? 'bg-[#0000FF] text-white'
                  : 'bg-transparent text-black hover:bg-black/10'
              }`}
            >
              {h.forAgents}
            </button>
          </div>
        </div>

        {viewMode === 'business' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-[#0000FF]/10 rounded-xl">
                  <Rocket className="w-8 h-8 text-[#0000FF]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-black">{h.advertiseTitle}</h2>
                  <p className="text-black/60">{h.advertiseSub}</p>
                </div>
              </div>

              <p className="text-lg text-black/80 mb-6">{h.advertiseBody}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">{h.contextual}</h3>
                    <p className="text-sm text-black/60">{h.contextualDesc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">{h.engagement}</h3>
                    <p className="text-sm text-black/60">{h.engagementDesc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">{h.lowerCost}</h3>
                    <p className="text-sm text-black/60">{h.lowerCostDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-black mb-2 text-center">{h.comparison}</h2>
              <p className="text-black/60 text-center mb-8">{h.comparisonSub}</p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-black/10">
                      <th className="text-left py-4 px-6 text-black font-semibold">{h.metric}</th>
                      <th className="text-center py-4 px-6 text-black font-semibold">{h.googleAds}</th>
                      <th className="text-center py-4 px-6 text-[#0000FF] font-semibold bg-[#0000FF]/5">{h.ourPlatform}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">O'rtacha CPC (bosish narxi)</td>
                      <td className="py-4 px-6 text-center text-black">$2.69</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$0.87</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">O'rtacha CPM (1000 ko'rish)</td>
                      <td className="py-4 px-6 text-center text-black">$38.40</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$12.50</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">O'rtacha CPA (konversiya narxi)</td>
                      <td className="py-4 px-6 text-center text-black">$48.96</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$18.42</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">CTR (bosishlar ulushi)</td>
                      <td className="py-4 px-6 text-center text-black">3.17%</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">8.94%</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Konversiya darajasi</td>
                      <td className="py-4 px-6 text-center text-black">4.40%</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">11.80%</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">ROI (investitsiya qaytishi)</td>
                      <td className="py-4 px-6 text-center text-black">200%</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">436%</td>
                    </tr>
                    <tr className="border-b border-black/5">
                      <td className="py-4 px-6 text-black font-medium">Sozlash vaqti</td>
                      <td className="py-4 px-6 text-center text-black">2-3 hafta</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">24 soat</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-black font-medium">Minimal oylik xarajat</td>
                      <td className="py-4 px-6 text-center text-black">$1,000+</td>
                      <td className="py-4 px-6 text-center text-[#0000FF] font-semibold bg-[#0000FF]/5">$250</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-black mb-4">{h.readyBusiness}</h2>
              <p className="text-lg text-black/60 mb-6">{h.readyBusinessSub}</p>
              <div className="flex gap-4 justify-center">
                <Link to="/business/analytics">
                  <button className="px-8 py-4 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors flex items-center gap-2">
                    {h.startAdvertising}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link to="/demo">
                  <button className="px-8 py-4 bg-black/5 text-black font-medium rounded-lg hover:bg-black/10 transition-colors">
                    {h.viewDemo}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'agent' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-[#0000FF]/10 rounded-xl">
                  <Code className="w-8 h-8 text-[#0000FF]" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-black">{h.monetizeTitle}</h2>
                  <p className="text-black/60">{h.monetizeSub}</p>
                </div>
              </div>

              <p className="text-lg text-black/80 mb-6">{h.monetizeBody}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">{h.easyIntegration}</h3>
                    <p className="text-sm text-black/60">{h.easyIntegrationDesc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">{h.contextualMatch}</h3>
                    <p className="text-sm text-black/60">{h.contextualMatchDesc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#0000FF] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-black mb-1">{h.transparentRevenue}</h3>
                    <p className="text-sm text-black/60">{h.transparentRevenueDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-black mb-8 text-center">{h.howItWorks}</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0000FF]/10 rounded-full mb-4">
                    <span className="text-2xl font-bold text-[#0000FF]">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">{h.step1Title}</h3>
                  <p className="text-black/60">{h.step1Desc}</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0000FF]/10 rounded-full mb-4">
                    <span className="text-2xl font-bold text-[#0000FF]">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">{h.step2Title}</h3>
                  <p className="text-black/60">{h.step2Desc}</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0000FF]/10 rounded-full mb-4">
                    <span className="text-2xl font-bold text-[#0000FF]">3</span>
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">{h.step3Title}</h3>
                  <p className="text-black/60">{h.step3Desc}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black/10 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-black mb-6">{h.apiExample}</h2>

              <div className="bg-black/5 rounded-lg p-6 font-mono text-sm mb-6 overflow-x-auto">
                <pre className="text-black">
{`// B2B tezkor so'rov namunasi
POST https://api.synaptic.uz/authorized/send_result

{
  "prompt": "iPhone 15 narxi qancha?",
  "api_key": "sk-synaptic-demo..."
}

// Javob:
{
  "match": true,
  "suggestion": "Bizda iPhone 15 uchun eng yaxshi narxlar bor. Ko'rib chiqing!",
  "tracking_url": "https://synaptic.uz/t/uzum-electronics-001"
}`}
                </pre>
              </div>
              <p className="text-black/60 mb-4">{h.apiExampleDesc}</p>
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold text-black mb-4">{h.startEarning}</h2>
              <p className="text-lg text-black/60 mb-6">{h.startEarningSub}</p>
              <div className="flex gap-4 justify-center">
                <Link to="/agent/analytics">
                  <button className="px-8 py-4 bg-[#0000FF] text-white rounded-lg hover:bg-[#0000CC] transition-colors flex items-center gap-2">
                    {h.getApiAccess}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link to="/demo">
                  <button className="px-8 py-4 bg-black/5 text-black font-medium rounded-lg hover:bg-black/10 transition-colors">
                    {h.viewDemo}
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
