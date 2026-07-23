import React from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BlogPage() {
  const navigate = useNavigate();

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
      img: "https://images.unsplash.com/photo-1558441719-67450807e906?auto=format&fit=crop&w=600&q=80",
      excerpt: "Charge your EV hassle-free while enjoying delicious local food at verified highway hubs."
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      <main className="flex-1">
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
                      onClick={() => navigate('/')}
                      className="text-xs font-bold text-[#E0332F] flex items-center gap-1.5 hover:gap-2 transition-all"
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
      </main>

      <LandingFooter />
    </div>
  );
}
