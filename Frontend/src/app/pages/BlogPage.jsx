import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import PageTransition from '@/shared/components/motion/PageTransition';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import {
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
  Clock,
  Award,
  Shield,
  Sparkles,
  Search,
  BookOpen,
  MapPin,
  Share2,
  Navigation,
  Compass,
  CheckCircle2
} from 'lucide-react';

export default function BlogPage() {
  const shouldReduceMotion = useReducedMotionSafe();
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const blogPosts = [
    {
      id: 1,
      title: "Top 10 Food Stops on NH 48 You Shouldn't Miss",
      date: "July 20, 2026",
      author: "Highway Foodie",
      authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
      category: "Guides",
      img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
      excerpt: "Discover authentic dhabas and gourmet rest stops on NH 48 between Delhi and Mumbai.",
      readTime: "6 min read",
      highlight: "★ Prime Route Pick"
    },
    {
      id: 2,
      title: "How Pre-Ordering Food Saves 45 Mins Per Highway Stop",
      date: "July 15, 2026",
      author: "Travel Team",
      authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
      category: "Tips",
      img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
      excerpt: "Learn how smart pre-ordering transforms road-tripping and prevents travel fatigue.",
      readTime: "4 min read",
      highlight: "⏱ Time Hack"
    },
    {
      id: 3,
      title: "EV Charging & Highway Dining: The Perfect Combination",
      date: "July 10, 2026",
      author: "EV Explorer",
      authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
      category: "EV Travel",
      img: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
      excerpt: "Charge your EV hassle-free while enjoying delicious local food at verified highway hubs.",
      readTime: "5 min read",
      highlight: "⚡ Eco Travel"
    }
  ];

  const blogDetails = {
    1: {
      readTime: "6 min read",
      tags: ["NH 48", "Food Stop Guide", "Dhabas"],
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed text-sm md:text-base">
          <p className="font-medium text-lg text-gray-900 leading-normal">
            Connecting the national capital of Delhi to the financial capital of Mumbai, National Highway 48 (NH 48) is not just a road—it is a culinary adventure. As you transition from the rich spices of Haryana and Rajasthan to the savory Kathiyawadi thalis of Gujarat and finally the coastal flavors of Maharashtra, your journey is punctuated by some of India's finest road-side dining destinations.
          </p>
          <p>
            Traveling can be exhausting, but finding the right food stop makes all the difference. Here are the top stopovers that promise pristine hygiene, high-quality food, and pristine washrooms:
          </p>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">1. Rao Dhaba, Dharuhera (Haryana)</h3>
          <p>
            Famous for its legendary North Indian vegetarian spread. Do not leave without trying their Sarson Ka Saag (seasonal) or Paneer Butter Masala served with freshly made butter-dripping Tandoori Roti.
          </p>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">2. Hotel Highway King, Bilaspur & Neemrana</h3>
          <p>
            A pristine, multi-cuisine hub that has become a staple for travelers. It offers everything from piping hot South Indian dosas to classic Haryanvi thalis. It also boasts massive parking spaces and state-of-the-art clean washroom blocks.
          </p>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">3. Kathiyawadi Dhabas, Near Vadodara (Gujarat)</h3>
          <p>
            As you enter Gujarat, Kathiyawadi cuisine is a must-try. Spicy Sev Tamatar, Ringan No Oro (roasted eggplant), and sweet buttermilk (chaas) will recharge your energy levels for the drive ahead.
          </p>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">4. Shri Datta Snacks, Panvel (Maharashtra)</h3>
          <p>
            Famous for authentic Maharashtrian snacks. Grab a Batata Vada, Kanda Bhajji, or a plate of warm Sabudana Khichdi paired with hot ginger tea to fuel the final leg of your journey.
          </p>
          
          <div className="bg-[#FFF5F5] border border-red-100 rounded-2xl p-6 mt-8">
            <h4 className="font-bold text-gray-900 mb-2">💡 Pro Travel Tip:</h4>
            <p className="text-xs sm:text-sm text-gray-700">
              Use the Bhookingo app's <strong>Highway Driving Mode</strong> to track these premium outlets on your route. You can pre-order your meals 20 minutes before arrival so your food is served fresh and hot the moment you step inside.
            </p>
          </div>
        </div>
      )
    },
    2: {
      readTime: "4 min read",
      tags: ["Pre-ordering", "Travel Hacks", "Time Saver"],
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed text-sm md:text-base">
          <p className="font-medium text-lg text-gray-900 leading-normal">
            We have all been there: you pull into a crowded highway food plaza, search for parking, queue up to order, wait for the kitchen to prepare the food, and finally eat. Before you know it, a quick lunch stop has devoured over an hour of your travel time.
          </p>
          <p>
            On long-distance road trips, time efficiency is key to maintaining driver stamina and reaching your destination safely before dark. Let's break down how pre-ordering changes the math of road travel.
          </p>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">The Traditional Stop Breakdown (60+ Minutes)</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Parking and choosing:</strong> 10 minutes finding a spot and deciding on a restaurant.</li>
            <li><strong>Ordering queue:</strong> 15 minutes waiting to place the order and pay.</li>
            <li><strong>Kitchen preparation:</strong> 20 minutes waiting for the kitchen buzzer to ring.</li>
            <li><strong>Dining:</strong> 20 minutes eating the meal.</li>
          </ul>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">The Bhookingo Pre-Order Flow (15 Minutes)</h3>
          <p>
            By placing your order 15-30 km before you reach the restaurant, the kitchen prepares your food while you are still driving. The moment you park:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Your food is ready and waiting at your designated table or takeaway counter.</li>
            <li>You skip the order queue and preparation wait completely.</li>
            <li>You eat, refresh, and get back on the road in under 15 minutes.</li>
          </ul>
          
          <div className="bg-[#FFF5F5] border border-red-100 rounded-2xl p-6 mt-8">
            <h4 className="font-bold text-gray-900 mb-2">🚗 Drive Mode Active:</h4>
            <p className="text-xs sm:text-sm text-gray-700">
              Bhookingo's real-time journey calculator tracks your speed and coordinate projection to notify the kitchen of your exact arrival time. This ensures your food is neither cold nor undercooked when you arrive.
            </p>
          </div>
        </div>
      )
    },
    3: {
      readTime: "5 min read",
      tags: ["EV Charging", "Sustainable Travel", "Highway Infrastructure"],
      content: (
        <div className="space-y-6 text-gray-700 leading-relaxed text-sm md:text-base">
          <p className="font-medium text-lg text-gray-900 leading-normal">
            The electric vehicle revolution is transforming Indian highways. However, one of the biggest challenges for EV drivers remains 'range anxiety' and planning stops around charging infrastructure. What if you could turn that charging wait into a delightful dining experience?
          </p>
          <p>
            An EV fast-charge cycle usually takes between 30 to 50 minutes. Coincidentally, this matches the exact time needed for a traveler to relax, grab a meal, and refresh. By matching charging hubs with premium dining outlets, you save time and travel in absolute comfort.
          </p>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">Smart Infrastructure Integration</h3>
          <p>
            Top restaurant networks are partnering with major EV network providers to deploy DC fast chargers directly at their parking bays. This means you do not have to wait at industrial zones or isolated locations to charge your car.
          </p>
          
          <h3 className="text-xl font-bold text-gray-900 mt-8">Why This Matters:</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Concurrent Efficiency:</strong> Your car charges while you dine. No time is wasted.</li>
            <li><strong>Safe Spaces:</strong> Premium highway restaurants offer secure parking, well-lit spaces, and professional guards, ensuring vehicle safety.</li>
            <li><strong>Family Comfort:</strong> Clean restrooms, kids play areas, and multi-cuisine menus mean the whole family is happy while the car charges.</li>
          </ul>
          
          <div className="bg-[#FFF5F5] border border-red-100 rounded-2xl p-6 mt-8">
            <h4 className="font-bold text-gray-900 mb-2">⚡ EV Search Filter:</h4>
            <p className="text-xs sm:text-sm text-gray-700">
              Open Bhookingo, enter your route, and check the 'EV Charging' option. The app only lists verified restaurants with active EV charging stations, letting you plan your charging stops without stress.
            </p>
          </div>
        </div>
      )
    }
  };

  const categories = ['All', 'Guides', 'Tips', 'EV Travel'];

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    const matchesQuery = searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const selectedPost = blogPosts.find(p => p.id === selectedPostId);
  const selectedDetail = selectedPostId ? blogDetails[selectedPostId] : null;

  return (
    <div className="landing-shell min-h-screen flex flex-col text-[color:var(--landing-text)]">
      <LandingHeader />

      <PageTransition>
        <main className="flex-1">
        {selectedPost && selectedDetail ? (
          /* ========================================================================= */
          /* BLOG DETAIL ARTICLE VIEW                                                  */
          /* ========================================================================= */
          <article className="py-12 md:py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              {/* Back to Blog Button */}
              <button
                onClick={() => setSelectedPostId(null)}
                className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[color:var(--landing-text)] hover:text-[color:var(--landing-accent)] transition-all mb-8 bg-white px-5 py-2.5 rounded-full border border-[color:var(--landing-line)] shadow-sm hover:shadow-md cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
                <span>Back to Stories</span>
              </button>

              {/* Detail Card Container */}
              <div className="bg-white rounded-[36px] overflow-hidden border border-[color:var(--landing-line)] shadow-[0_22px_60px_rgba(71,43,24,0.08)]">
                <div className="h-72 sm:h-[420px] overflow-hidden relative">
                  <img src={selectedPost.img} alt={selectedPost.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#16100d] via-[#16100d]/50 to-transparent flex flex-col justify-end p-6 sm:p-10">
                    <span className="bg-[color:var(--landing-accent)] text-white text-[10px] font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider w-max mb-3 shadow-md">
                      {selectedPost.category}
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight font-[var(--font-display)]">
                      {selectedPost.title}
                    </h1>
                  </div>
                </div>

                <div className="p-6 sm:p-10 space-y-8">
                  {/* Author Component inside Detail View */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--landing-line)] pb-6">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={selectedPost.authorAvatar}
                        alt={selectedPost.author}
                        className="h-12 w-12 rounded-full object-cover border-2 border-[color:var(--landing-accent)] shadow-sm"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-gray-900">{selectedPost.author}</span>
                        <span className="text-xs text-gray-500">{selectedPost.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 border border-gray-200 text-xs font-bold text-gray-700">
                      <Clock className="w-3.5 h-3.5 text-[color:var(--landing-accent)]" />
                      <span>{selectedDetail.readTime}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="prose max-w-none">
                    {selectedDetail.content}
                  </div>

                  {/* Tags */}
                  <div className="pt-6 border-t border-[color:var(--landing-line)] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedDetail.tags.map((tag, idx) => (
                        <span key={idx} className="bg-[#fff1f1] text-[color:var(--landing-accent)] text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider border border-red-100">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => setSelectedPostId(null)}
                      className="text-xs font-extrabold text-[color:var(--landing-accent)] flex items-center gap-1 hover:underline"
                    >
                      <span>Read Next Story</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ) : (
          /* ========================================================================= */
          /* BLOG LIST VIEW                                                            */
          /* ========================================================================= */
          <>
            {/* Hero Section (Matches Centralized Cinematic Dark Road Theme) */}
            <section className="relative overflow-hidden bg-[#100B08] text-white flex items-center py-8 sm:py-10 lg:py-12 min-h-[500px] lg:min-h-[560px]">
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
                <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-6">
                  {/* Left Content Column */}
                  <div className="lg:col-span-7 flex flex-col justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: EASING.smooth }}
                    >
                      <span className="landing-hero-badge">
                        Bhookingo Blog
                      </span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.10, ease: EASING.smooth }}
                      className="mt-4 sm:mt-5"
                    >
                      <h1 className="landing-hero-h1 max-w-2xl">
                        Highway Stories & <span className="text-[color:var(--landing-accent)]">Travel Guides</span>
                      </h1>
                      <p className="landing-hero-body mt-3 sm:mt-3.5">
                        Insider tips, food recommendations, and road-trip guides for Indian highway travelers.
                      </p>
                    </motion.div>

                    {/* Search Bar & Action Input */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.20, ease: EASING.smooth }}
                      className="flex flex-wrap items-center gap-3 mt-5 sm:mt-6 max-w-xl"
                    >
                      <div className="flex-1 min-w-[220px] relative font-[var(--font-ui)]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
                        <input
                          type="text"
                          placeholder="Search highway stories, tips, dhabas..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full rounded-full border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[color:var(--landing-accent)] backdrop-blur-md transition-all shadow-inner"
                        />
                      </div>
                    </motion.div>

                    {/* Standardized Three Story Pillar Cards in Hero */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.32, ease: EASING.smooth }}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 sm:mt-7"
                    >
                      {[
                        { value: 'Verified Dhabas', label: 'Curated taste & hygiene tests across NH corridors' },
                        { value: 'Pre-Order Hacks', label: 'Save 45+ minutes on long distance drives' },
                        { value: 'EV Highway Hubs', label: 'Simultaneous fast charging & dining locations' }
                      ].map((item) => (
                        <div
                          key={item.value}
                          className="landing-pillar-card"
                        >
                          <div className="landing-pillar-title">{item.value}</div>
                          <p className="landing-pillar-body">{item.label}</p>
                        </div>
                      ))}
                    </motion.div>
                  </div>

                  {/* Right Hero: Featured Story Spotlight Card */}
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.35, ease: EASING.smooth }}
                    className="lg:col-span-5 lg:pl-2 xl:pl-4 mt-6 lg:mt-0"
                  >
                    <div className="landing-showcase-panel-outer">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(214,40,40,0.22)] blur-3xl" />
                      <div className="pointer-events-none absolute -left-8 bottom-8 h-24 w-24 rounded-full bg-white/8 blur-2xl" />

                      <div className="landing-showcase-panel-inner">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div>
                            <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#FF8582]">
                              FEATURED STORY
                            </div>
                            <h2 className="pt-0.5 font-[var(--font-display)] text-base sm:text-lg font-bold text-white">
                              Editor's Highway Pick
                            </h2>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/8 p-2 text-[color:var(--landing-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <BookOpen className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl overflow-hidden relative h-28 border border-white/10">
                          <img
                            src={blogPosts[0].img}
                            alt="Featured"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 flex flex-col justify-end">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#FF8582] font-[var(--font-ui)]">
                              {blogPosts[0].category}
                            </span>
                            <span className="text-xs font-bold text-white line-clamp-1 font-[var(--font-ui)]">
                              {blogPosts[0].title}
                            </span>
                          </div>
                        </div>

                        <p className="pt-2 text-[11px] leading-relaxed text-[#dccac0] font-[var(--font-ui)]">
                          {blogPosts[0].excerpt}
                        </p>

                        <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between font-[var(--font-ui)]">
                          <div className="flex items-center gap-2">
                            <img
                              src={blogPosts[0].authorAvatar}
                              alt={blogPosts[0].author}
                              className="h-7 w-7 rounded-full object-cover border border-white/20"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white leading-tight">{blogPosts[0].author}</span>
                              <span className="text-[9.5px] text-gray-400">{blogPosts[0].date}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedPostId(1)}
                            className="flex items-center gap-1 text-xs font-bold text-[#FF8582] hover:text-white transition-colors cursor-pointer"
                          >
                            <span>Read Story</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Quick Benefit Metric Strip */}
            <section className="border-y border-[color:var(--landing-line)] bg-[rgba(255,255,255,0.65)] py-6">
              <div className="mx-auto grid max-w-7xl gap-3.5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
                {[
                  { title: "NH Corridor Guides", copy: "Tested recommendations for Delhi-Mumbai, NH-44 and major highways." },
                  { title: "Pre-Order Travel Hacks", copy: "Smart timings & route tricks to eliminate mealtime stops delay." },
                  { title: "EV Highway Hubs", copy: "Verified DC fast charging points paired with comfortable eateries." },
                  { title: "Family Rest Stops", copy: "Pristine washroom ratings, ample parking and kid-friendly dining." }
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className="relative rounded-2xl border border-[color:var(--landing-line)] bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="absolute left-0 top-5 h-10 w-1 rounded-r-full bg-[color:var(--landing-accent)]" />
                    <div className="flex items-start justify-between gap-3 pl-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1f1] text-[color:var(--landing-accent)]">
                        <Sparkles className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-black text-[#d1c3b9]">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="pt-3.5 pl-2.5 font-[var(--font-display)] text-base font-black text-[color:var(--landing-text)]">
                      {item.title}
                    </h3>
                    <p className="pt-1 pl-2.5 text-xs leading-relaxed text-[color:var(--landing-text-muted)]">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* BLOG POSTS FULL-IMAGE CARDS                                               */}
            {/* ========================================================================= */}
            <section id="articles-grid" className="relative overflow-hidden bg-[linear-gradient(180deg,#fff9f7_0%,#fcf5f0_45%,#f8ede4_100%)] border-b border-[color:var(--landing-line)] py-10 md:py-14">
              {/* Atmospheric Glow Highlights */}
              <div className="pointer-events-none absolute -right-20 top-1/4 h-96 w-96 rounded-full bg-[rgba(224,51,47,0.06)] blur-3xl" />
              <div className="pointer-events-none absolute -left-20 bottom-1/4 h-96 w-96 rounded-full bg-[rgba(245,158,11,0.05)] blur-3xl" />

              <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header & Category Filters */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[color:var(--landing-line)]">
                  <div className="max-w-2xl space-y-2">
                    <span className="landing-section-label text-[11px] font-extrabold text-[color:var(--landing-accent)]">
                      EXPLORE CHRONICLES
                    </span>
                    <h2 className="landing-subtitle text-2xl sm:text-3xl font-black text-[color:var(--landing-text)]">
                      Latest Highway Articles &
                      <span className="text-[color:var(--landing-accent)]"> Food Chronicles</span>
                    </h2>
                    <p className="text-xs sm:text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                      Handpicked guides crafted by experienced highway trippers and culinary explorers.
                    </p>
                  </div>

                  {/* Category Filter Pills Container */}
                  <div className="flex flex-wrap items-center gap-1 p-1 rounded-full bg-white/90 border border-[color:var(--landing-line)] shadow-2xs backdrop-blur-md">
                    {categories.map((cat) => {
                      const isActive = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`relative rounded-full px-4 py-1.5 text-[11px] font-extrabold tracking-wide transition-colors cursor-pointer select-none ${
                            isActive
                              ? 'text-white'
                              : 'text-[color:var(--landing-text-muted)] hover:text-[color:var(--landing-text)]'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="blogFilterActive"
                              className="absolute inset-0 rounded-full bg-[#1b130f] shadow-sm"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Full-Image 3-Layer Editorial Cards */}
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredPosts.map((post, idx) => (
                      <motion.article
                        layout
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.35, ease: EASING.smooth }}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedPostId(post.id)}
                        className={`group relative h-[400px] sm:h-[440px] rounded-2xl overflow-hidden border border-white/20 shadow-md cursor-pointer select-none transition-shadow duration-500 hover:shadow-lg ${
                          idx === 0 && activeCategory === 'All' ? 'ring-1 ring-[color:var(--landing-accent)]/30' : ''
                        }`}
                      >
                        {/* Layer 1: Parallax Zoom Image */}
                        <div className="absolute inset-0 overflow-hidden">
                          <img
                            src={post.img}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        </div>

                        {/* Layer 2: Multi-Layer Cinematic Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0a08]/98 via-[#0e0a08]/60 to-black/25 transition-opacity duration-300 group-hover:opacity-90" />

                        {/* Top Badges (Category & Highlight) */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                          <span className="rounded-full border border-white/25 bg-white/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs backdrop-blur-md">
                            {post.highlight}
                          </span>

                          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[9.5px] font-bold text-gray-200 backdrop-blur-md">
                            {post.readTime}
                          </span>
                        </div>

                        {/* Layer 3: Bottom Content Area */}
                        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-5.5 flex flex-col justify-end z-10 space-y-3 transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
                          {/* Category Label */}
                          <div>
                            <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#f2b2b2]">
                              {post.category}
                            </span>
                            <h2 className="pt-1 font-[var(--font-display)] text-lg sm:text-xl font-black text-white leading-snug group-hover:text-[#ffe5e5] transition-colors">
                              {post.title}
                            </h2>
                            <p className="pt-1.5 text-xs text-[#d8c7bb] leading-relaxed line-clamp-2">
                              {post.excerpt}
                            </p>
                          </div>

                          {/* Author Info Bar */}
                          <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={post.authorAvatar}
                                alt={post.author}
                                className="h-8 w-8 rounded-full object-cover border border-white/30 shadow-xs group-hover:border-[color:var(--landing-accent)] transition-all duration-300"
                              />
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-white leading-tight group-hover:text-[color:var(--landing-accent-soft)] transition-colors">
                                  By • {post.author}
                                </span>
                                <span className="text-[10px] font-medium text-[#d8c7bb] pt-0.5">
                                  {post.date}
                                </span>
                              </div>
                            </div>

                            <div className="h-7.5 w-7.5 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white group-hover:bg-[color:var(--landing-accent)] transition-colors">
                              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            </section>

            {/* High Conversion Bottom CTA Banner */}
            <section className="pb-10 md:pb-14">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-3xl bg-[#1a120f] px-6 py-8 text-white shadow-xl sm:px-8 md:py-10 relative">
                  <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[rgba(214,40,40,0.25)] blur-3xl" />

                  <div className="relative grid items-center gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8 space-y-2">
                      <span className="landing-section-label text-[10px] font-extrabold text-[#f2b2b2]">
                        ROAD TRIP READY
                      </span>
                      <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-black">
                        Have a Highway Story or Dhaba Recommendation?
                      </h2>
                      <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[#d8c7bb]">
                        Share your highway travel insights with thousands of travelers across India on Bhookingo.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
                      <button
                        onClick={() => window.open('https://play.google.com/store/apps/details?id=com.bhookingo.user', '_blank')}
                        className="landing-button-primary flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-[0.18em] group active:scale-95 shadow-md"
                      >
                        <span>Download App</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      </PageTransition>

      <LandingFooter />
    </div>
  );
}

