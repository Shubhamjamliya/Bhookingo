import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  LocateFixed,
  MapPinned,
  Navigation,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
  Zap
} from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import PageTransition from '@/shared/components/motion/PageTransition';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';

const steps = [
  {
    number: '01',
    title: 'Set your route or open Drive Mode',
    description:
      'Start with your live journey, or search manually if you are planning before the trip. Bhookingo understands highway movement and keeps the discovery experience focused on what is actually useful ahead.',
    icon: Navigation,
    highlights: ['Live route-aware experience', 'Works for planning or in-motion discovery', 'Built for highway travelers, not city browsing'],
    stat: 'Forward-only logic',
    tone: 'Travel flow',
    accent: 'from-[#fff1f1] to-[#ffe5e5]'
  },
  {
    number: '02',
    title: 'See only relevant restaurants ahead',
    description:
      'Instead of sending travelers backward or far off-route, Bhookingo highlights forward restaurants, practical stop points, and useful facility signals like washrooms, parking, and EV charging.',
    icon: MapPinned,
    highlights: ['Stops ahead on your route', 'Helpful travel filters', 'Amenities before you arrive'],
    stat: 'Cleaner decisions',
    tone: 'Better discovery',
    accent: 'from-[#fff8f3] to-[#fff0ea]'
  },
  {
    number: '03',
    title: 'Choose food, reserve, and pre-order',
    description:
      'Browse menus, compare options, and place the order before you reach. Pick takeaway for speed or select dine-in when the stop is part of the journey experience.',
    icon: UtensilsCrossed,
    highlights: ['Pre-order before arrival', 'Takeaway and dine-in options', 'Digital menu and secure checkout'],
    stat: 'Less waiting',
    tone: 'Fast ordering',
    accent: 'from-[#f8fff8] to-[#ecfff1]'
  },
  {
    number: '04',
    title: 'Arrive, eat better, continue smoothly',
    description:
      'Your stop feels planned instead of random. Food is closer to ready, your break is more comfortable, and you can get back on the highway with less friction.',
    icon: Car,
    highlights: ['More predictable stops', 'Higher comfort and confidence', 'Saves time on long journeys'],
    stat: 'Smoother travel',
    tone: 'Journey regained',
    accent: 'from-[#fff7f7] to-[#fff2f2]'
  }
];

const benefitCards = [
  { icon: Clock3, title: 'Save waiting time', copy: 'Pre-order before arrival so the stop feels faster and more controlled.' },
  { icon: ShieldCheck, title: 'Choose with confidence', copy: 'A route-focused experience helps reduce random, low-trust stop decisions.' },
  { icon: CreditCard, title: 'Checkout easily', copy: 'Pay through familiar digital flows with a smoother ordering experience.' },
  { icon: Zap, title: 'Travel with context', copy: 'See practical details like EV charging, parking, and washroom support.' }
];

const paths = [
  {
    title: 'Drive Mode',
    label: 'Best while traveling',
    icon: LocateFixed,
    description:
      'Designed for live highway movement. Open the route-aware experience and discover relevant food stops ahead without constant searching.',
    points: ['Live location-based flow', 'Less searching while driving', 'Best for on-road convenience'],
    action: 'Start Drive Mode'
  },
  {
    title: 'Search Mode',
    label: 'Best before the trip',
    icon: Search,
    description:
      'Perfect for planning before you leave or checking a specific destination. Search by restaurant, area, or city and prepare your stop in advance.',
    points: ['Plan before departure', 'Browse any restaurant quickly', 'Useful for families and long trips'],
    action: 'Browse on Web'
  }
];

export default function HowItWorksPage() {
  const navigate = useNavigate();

  const openUserFlow = () => {
    navigate('/user/auth/login');
  };

  return (
    <div className="landing-shell min-h-screen flex flex-col text-[color:var(--landing-text)]">
      <LandingHeader />

      <PageTransition>
        <main className="flex-1">
        <section className="relative overflow-hidden bg-[#100B08] text-white flex items-center py-12 sm:py-16 lg:py-20 min-h-[640px] lg:min-h-[700px]">
          <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
            <img
              src="/assets/images/landingbg.png"
              alt="Highway road"
              className="h-full w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C0806]/96 via-[#0E0907]/85 to-[#0E0907]/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#100B08] via-transparent to-black/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0C0806]/30 to-[#0C0806]/90" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-8">
              {/* Left Content Column */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div>
                  <span className="landing-hero-badge">
                    The Bhookingo Journey
                  </span>
                </div>

                <div className="mt-6 sm:mt-7">
                  <h1 className="landing-hero-h1 max-w-2xl">
                    From highway hunger to a planned stop <span className="text-[color:var(--landing-accent)]">without the chaos</span>
                  </h1>
                  <p className="landing-hero-body mt-4 sm:mt-5">
                    Bhookingo is built for real road journeys. It helps travelers discover better highway restaurants ahead, order before arrival, and turn random breaks into smoother, smarter stops.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 mt-7 sm:mt-8">
                  <button
                    onClick={openUserFlow}
                    className="landing-button-primary flex items-center gap-2.5 rounded-full px-7 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_25px_rgba(224,51,47,0.35)] hover:shadow-[0_12px_32px_rgba(224,51,47,0.55)] transition-all active:scale-95 group cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    <span>Try Bhookingo</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                  <a
                    href="#journey-steps"
                    className="landing-button-secondary flex items-center gap-2.5 rounded-full px-7 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold tracking-wider text-white shadow-lg backdrop-blur-md transition-all group cursor-pointer"
                  >
                    <span>See The Flow</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>

                {/* Standardized Three Pillar Cards in Hero */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 sm:mt-9">
                  {[
                    { value: 'Forward-First', label: 'Restaurant discovery built for highway direction' },
                    { value: 'Pre-Order', label: 'Food before arrival, not after the wait' },
                    { value: 'Comfort-Led', label: 'Facilities and trust signals along the way' }
                  ].map((item) => (
                    <div
                      key={item.value}
                      className="landing-pillar-card"
                    >
                      <div className="landing-pillar-title">{item.value}</div>
                      <p className="landing-pillar-body">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Mobile Flow Mockup */}
              <div className="lg:col-span-5 lg:pl-2 xl:pl-4 mt-8 lg:mt-0">
                <div className="landing-showcase-panel-outer">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(214,40,40,0.22)] blur-3xl" />
                  <div className="pointer-events-none absolute -left-8 bottom-8 h-20 w-20 rounded-full bg-white/8 blur-2xl" />

                  <div className="landing-showcase-panel-inner">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF8582]">
                          Example journey
                        </div>
                        <h2 className="pt-0.5 font-[var(--font-display)] text-lg sm:text-xl font-bold text-white">
                          Hyderabad to Vijayawada
                        </h2>
                        <p className="pt-0.5 text-[11px] sm:text-xs text-[#e8d8ce] leading-relaxed font-[var(--font-ui)]">
                          See how Bhookingo guides one highway food stop from route detection to pickup.
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/8 p-2.5 text-[color:var(--landing-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <Navigation className="h-4.5 w-4.5" />
                      </div>
                    </div>

                    <div className="space-y-2 pt-3">
                      {[
                        { icon: LocateFixed, title: 'Route detected', detail: 'The app understands your highway direction and focuses only on stops ahead.' },
                        { icon: Store, title: 'Best stop options appear', detail: 'You see relevant restaurants with parking, washroom, and comfort details early.' },
                        { icon: UtensilsCrossed, title: 'Order before arrival', detail: 'Choose takeaway or dine-in, then place the order while you are still on the road.' },
                        { icon: Sparkles, title: 'Stop smarter, continue faster', detail: 'You arrive with more confidence, spend less time waiting, and get back on route smoothly.' }
                      ].map((item, index) => (
                        <div key={item.title} className="rounded-xl border border-white/8 bg-white/[0.04] p-2 sm:p-2.5 backdrop-blur-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.04)_100%)] text-[color:var(--landing-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                <item.icon className="h-4 w-4" />
                              </div>
                              {index < 3 ? <div className="my-0.5 h-2.5 sm:h-3 w-px bg-white/15" /> : null}
                            </div>
                            <div className="pt-0.5 min-w-0">
                              <h3 className="font-[var(--font-display)] text-xs sm:text-sm font-bold text-white leading-tight">{item.title}</h3>
                              <p className="pt-0.5 text-[10.5px] sm:text-[11px] leading-4 text-[#dccac0] font-[var(--font-ui)]">{item.detail}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[color:var(--landing-line)] bg-[rgba(255,255,255,0.65)] py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {benefitCards.map((item, index) => (
              <div
                key={item.title}
                className="relative rounded-[24px] border border-[color:var(--landing-line)] bg-white p-5 shadow-[0_14px_35px_rgba(71,43,24,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(71,43,24,0.1)]"
              >
                <div className="absolute left-0 top-6 h-12 w-1 rounded-r-full bg-[color:var(--landing-accent)]" />
                <div className="flex items-start justify-between gap-4 pl-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1f1] text-[color:var(--landing-accent)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-black text-[#d1c3b9]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="pt-5 pl-3 font-[var(--font-display)] text-lg font-black text-[color:var(--landing-text)]">
                  {item.title}
                </h3>
                <p className="pt-2 pl-3 text-sm leading-7 text-[color:var(--landing-text-muted)]">
                  {item.copy}
                </p>
                <div className="pt-5 pl-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--landing-accent)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--landing-accent)]" />
                    <span>Highway Advantage</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="journey-steps" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                Step By Step
              </span>
              <h2 className="landing-subtitle pt-4 text-3xl font-black sm:text-4xl">
                A better highway food experience,
                <span className="text-[color:var(--landing-accent)]"> broken into simple moments</span>
              </h2>
              <p className="pt-4 text-base leading-8 text-[color:var(--landing-text-muted)]">
                The page flow mirrors the product logic: discover what matters, order before the stop, and keep the journey moving.
              </p>
            </div>

            <div className="relative mt-14 space-y-8">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`grid gap-6 rounded-[32px] border border-[color:var(--landing-line)] bg-white/80 p-6 shadow-[0_20px_60px_rgba(71,43,24,0.08)] backdrop-blur-xl lg:grid-cols-12 lg:p-8 ${index % 2 === 1 ? 'lg:[&>div:first-child]:order-2 lg:[&>div:last-child]:order-1' : ''}`}
                >
                  <div className="lg:col-span-7">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-[var(--font-display)] text-4xl font-black text-[color:var(--landing-accent)]">{step.number}</span>
                      <div className={`rounded-2xl bg-gradient-to-br ${step.accent} p-3 text-[color:var(--landing-accent)]`}>
                        <step.icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-[#fff1f1] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--landing-accent)]">
                        {step.tone}
                      </span>
                    </div>

                    <h3 className="pt-5 font-[var(--font-display)] text-2xl font-black sm:text-3xl">{step.title}</h3>
                    <p className="pt-4 max-w-2xl text-base leading-8 text-[color:var(--landing-text-muted)]">{step.description}</p>

                    <div className="grid gap-3 pt-6 sm:grid-cols-2">
                      {step.highlights.map((item) => (
                        <div key={item} className="flex items-start gap-3 rounded-2xl bg-[#fcf7f3] px-4 py-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          <span className="text-sm font-semibold text-[color:var(--landing-text)]">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="h-full rounded-[28px] bg-[#19120e] p-5 text-white">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                          <div className="landing-section-label text-[10px] font-extrabold text-[#f2b2b2]">Bhookingo advantage</div>
                          <div className="pt-2 font-[var(--font-display)] text-2xl font-black">{step.stat}</div>
                        </div>
                        <div className="rounded-2xl bg-white/8 p-3">
                          <step.icon className="h-6 w-6 text-[color:var(--landing-accent)]" />
                        </div>
                      </div>

                      <div className="space-y-4 pt-5">
                        <div className="rounded-[24px] bg-white/6 p-4">
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#f2b2b2]">Why it matters</div>
                          <p className="pt-2 text-sm leading-7 text-[#ddcec3]">
                            Bhookingo is not just an ordering layer. It improves the quality of stop decisions for people moving on highways.
                          </p>
                        </div>
                        <div className="rounded-[24px] bg-white/6 p-4">
                          <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#f2b2b2]">What changes for the user</div>
                          <p className="pt-2 text-sm leading-7 text-[#ddcec3]">
                            Instead of reacting late, the traveler gets earlier choices, better context, and more control over time and comfort.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={openUserFlow}
                        className="mt-6 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#1b130f] transition-transform hover:-translate-y-0.5"
                      >
                        <span>Try This Step</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[color:var(--landing-line)] bg-[linear-gradient(180deg,#fff8f7_0%,#fff2f2_100%)] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {paths.map((path, index) => (
                <div key={path.title} className="landing-surface-card rounded-[32px] p-7 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${index === 0 ? 'bg-[#ffe5e5] text-[color:var(--landing-accent)]' : 'bg-emerald-100 text-emerald-700'}`}>
                        {path.label}
                      </span>
                      <h3 className="pt-4 font-[var(--font-display)] text-3xl font-black text-[color:var(--landing-text)]">{path.title}</h3>
                    </div>
                    <div className={`rounded-2xl p-3 ${index === 0 ? 'bg-[#fff1f1] text-[color:var(--landing-accent)]' : 'bg-emerald-50 text-emerald-700'}`}>
                      <path.icon className="h-6 w-6" />
                    </div>
                  </div>

                  <p className="pt-5 text-base leading-8 text-[color:var(--landing-text-muted)]">{path.description}</p>

                  <div className="space-y-3 pt-6">
                    {path.points.map((point) => (
                      <div key={point} className="flex items-start gap-3">
                        <Star className={`mt-0.5 h-5 w-5 shrink-0 ${index === 0 ? 'text-[color:var(--landing-accent)]' : 'text-emerald-600'}`} />
                        <span className="text-sm font-semibold text-[color:var(--landing-text)]">{point}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={openUserFlow}
                    className={`mt-8 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold uppercase tracking-[0.16em] transition-transform hover:-translate-y-0.5 ${index === 0 ? 'landing-button-primary text-white' : 'border border-emerald-200 bg-white text-emerald-700'}`}
                  >
                    <span>{path.action}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                  Why It Feels Better
                </span>
                <h2 className="landing-subtitle pt-4 text-3xl font-black sm:text-4xl">
                  Good UX here is not decoration.
                  <span className="text-[color:var(--landing-accent)]"> It reduces travel friction.</span>
                </h2>
                <p className="pt-4 text-base leading-8 text-[color:var(--landing-text-muted)]">
                  The Bhookingo experience is strongest when the product gives confidence quickly. These are the principles this page now emphasizes.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
                {[
                  {
                    title: 'Clarity before urgency',
                    copy: 'Travelers should understand what the app does within seconds, especially when on the road.'
                  },
                  {
                    title: 'Useful context before choice',
                    copy: 'Restaurants, facilities, and route fit matter more than showing too many generic options.'
                  },
                  {
                    title: 'Action before arrival',
                    copy: 'Pre-ordering changes the travel stop experience because the decision happens earlier.'
                  },
                  {
                    title: 'Comfort is part of the product',
                    copy: 'Washrooms, parking, charging, and reliability all shape the quality of a highway break.'
                  }
                ].map((item) => (
                  <div key={item.title} className="landing-surface-card rounded-[28px] p-6">
                    <div className="h-11 w-11 rounded-2xl bg-[#fff1f1] text-[color:var(--landing-accent)] flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h3 className="pt-4 font-[var(--font-display)] text-xl font-bold text-[color:var(--landing-text)]">{item.title}</h3>
                    <p className="pt-2 text-sm leading-7 text-[color:var(--landing-text-muted)]">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[36px] bg-[#1a120f] px-6 py-10 text-white shadow-[0_30px_80px_rgba(35,20,14,0.22)] sm:px-10 md:py-14">
              <div className="grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <span className="landing-section-label text-[11px] font-extrabold text-[#f2b2b2]">Ready to experience it</span>
                  <h2 className="pt-4 font-[var(--font-display)] text-3xl font-black sm:text-4xl">
                    Make your next highway meal stop
                    <span className="text-[color:var(--landing-accent)]"> smarter, faster, and calmer</span>
                  </h2>
                  <p className="max-w-2xl pt-4 text-base leading-8 text-[#d8c7bb]">
                    Bhookingo is designed for people who want fewer random stops and better travel choices. Explore the product and feel the difference in the journey flow.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 lg:col-span-4 lg:justify-end">
                  <button
                    onClick={openUserFlow}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-7 py-4 text-sm font-extrabold uppercase tracking-[0.18em]"
                  >
                    <span>Open Bhookingo</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      </PageTransition>

      <LandingFooter />
    </div>
  );
}
