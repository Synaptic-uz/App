# Synaptic UI/UX Improvement Roadmap

Targeting a premium, enterprise-grade experience (Phase 2).

## High Priority (Immediate Impact)
- [ ] **Interactive Onboarding**: Add a guided tour for new business users explaining the "AI Research" -> "Campaign" -> "Analytics" flow.
- [ ] **Real-time Chart Interactions**: Enhance Recharts tooltips with custom branded styles and 1-click drill-downs into campaign details.
- [ ] **Dynamic Form Feedback**: While AI researches a campaign, show a "live" progress bar or status updates of what it's finding (keywords, competitors, tone).
- [ ] **Wallet Visuals**: Add a visual history of transactions with tiny color-coded badges (Deposit, Allocation, Spent).

## Visual Excellence & Polish
- [ ] **Micro-animations**: Add Framer Motion transitions for PageShell entry, Panel hovers, and Mobile Menu expansion.
- [ ] **Glassmorphism Refinement**: Apply subtle background blurs and border-glows to all Dialogs and core Panels for a more modern "Modern Saas" look.
- [ ] **Brand Identity**: Implement consistent usage of the Synaptic logo across all loading states (shimmer logos).
- [ ] **Accessibility (a11y)**: Audit all interactive elements for focus rings, ARIA labels, and keyboard navigation support.

## Feature Enhancements
- [ ] **Multi-Currency History**: Show historic exchange rates if currency was changed during a period.
- [ ] **AI Recommendation engine**: Show "AI Suggestions" cards in the Analytics dashboard suggesting budget optimizations based on CTR.
- [ ] **Dark Mode Support**: Implement a full dark mode theme using CSS variables and a toggle in Settings.

## Technical Optimization
- [ ] **Skeleton States**: Improve all loading skeletons to match the exact height/layout of the finished cards to prevent layout shift (CLS).
- [ ] **Image Optimization**: Ensure all branding/logo images are SVGs or optimized WebP.
- [ ] **Error States**: Design "Premium" empty states with custom illustrations instead of just text for No Data scenarios.
