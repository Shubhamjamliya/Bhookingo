import React, { useState } from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { Calendar, User, ArrowRight, ArrowLeft, Clock, Award, Shield } from 'lucide-react';

export default function BlogPage() {
  const [selectedPostId, setSelectedPostId] = useState(null);

  const blogPosts = [
    {
      id: 1,
      title: "Top 10 Food Stops on NH 48 You Shouldn't Miss",
      date: "July 20, 2026",
      author: "Highway Foodie",
      category: "Guides",
      img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
      excerpt: "Discover authentic dhabas and gourmet rest stops on NH 48 between Delhi and Mumbai."
    },
    {
      id: 2,
      title: "How Pre-Ordering Food Saves 45 Mins Per Highway Stop",
      date: "July 15, 2026",
      author: "Travel Team",
      category: "Tips",
      img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
      excerpt: "Learn how smart pre-ordering transforms road-tripping and prevents travel fatigue."
    },
    {
      id: 3,
      title: "EV Charging & Highway Dining: The Perfect Combination",
      date: "July 10, 2026",
      author: "EV Explorer",
      category: "EV Travel",
      img: "/ev_charging_highway.png",
      excerpt: "Charge your EV hassle-free while enjoying delicious local food at verified highway hubs."
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

  const selectedPost = blogPosts.find(p => p.id === selectedPostId);
  const selectedDetail = selectedPostId ? blogDetails[selectedPostId] : null;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      <main className="flex-1">
        {selectedPost && selectedDetail ? (
          /* BLOG DETAIL VIEW */
          <article className="py-12 bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              {/* Back to Blog List */}
              <button
                onClick={() => setSelectedPostId(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#E0332F] transition-colors mb-6 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Blog
              </button>

              {/* Detail Card */}
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="h-64 sm:h-[400px] overflow-hidden relative">
                  <img src={selectedPost.img} alt={selectedPost.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-6 sm:p-8">
                    <span className="bg-[#E0332F] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider w-max mb-3">
                      {selectedPost.category}
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                      {selectedPost.title}
                    </h1>
                  </div>
                </div>

                <div className="p-6 sm:p-10 space-y-6">
                  {/* Metadata Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 border-b border-gray-100 pb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400" /> {selectedPost.date}</span>
                    <span className="flex items-center gap-1"><User className="w-4 h-4 text-gray-400" /> {selectedPost.author}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-gray-400" /> {selectedDetail.readTime}</span>
                  </div>

                  {/* Body Content */}
                  <div>
                    {selectedDetail.content}
                  </div>

                  {/* Tags & Share */}
                  <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-2">
                    {selectedDetail.tags.map((tag, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ) : (
          /* BLOG LIST VIEW */
          <>
            {/* Hero */}
            <section className="bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white py-16 md:py-24 text-center px-4">
              <div className="max-w-4xl mx-auto space-y-4">
                <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
                  BHOOKINGO BLOG
                </span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                  Highway Stories & <span className="text-[#E0332F]">Travel Guides</span>
                </h1>
                <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                  Insider tips, food recommendations, and road-trip guides for Indian highway travelers.
                </p>
              </div>
            </section>

            {/* Blog Posts Grid */}
            <section className="py-16 md:py-24 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {blogPosts.map((post) => (
                    <article key={post.id} className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                      <div>
                        <div className="h-48 overflow-hidden relative">
                          <img src={post.img} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                            {post.category}
                          </span>
                        </div>
                        <div className="p-6 space-y-3">
                          <div className="flex items-center gap-4 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {post.author}</span>
                          </div>
                          <h2 className="text-lg font-bold text-gray-900 leading-snug group-hover:text-[#E0332F] transition-colors">{post.title}</h2>
                          <p className="text-xs text-gray-600 leading-relaxed">{post.excerpt}</p>
                        </div>
                      </div>
                      <div className="px-6 pb-6 pt-2">
                        <button
                          onClick={() => setSelectedPostId(post.id)}
                          className="text-xs font-bold text-[#E0332F] flex items-center gap-1.5 hover:gap-2 transition-all cursor-pointer"
                        >
                          <span>Read Full Article</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
