import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Laptop,
  CreditCard,
  Book,
  Key,
  Package,
  Sparkles,
  Users,
  Compass,
} from 'lucide-react';
import api from '../services/api';
import ItemCard from '../components/ItemCard';

export default function HomePage() {
  const [stats, setStats] = useState({
    totalReports: 0,
    lostCount: 0,
    foundCount: 0,
    resolvedCount: 0,
    recoveryRate: 0,
  });
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/items/stats'), api.get('/items/recent')])
      .then(([statsRes, recentRes]) => {
        if (statsRes.data?.success) setStats(statsRes.data.stats);
        if (recentRes.data?.success) setRecentItems(recentRes.data.items);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate('/browse');
    }
  };

  const categories = [
    { name: 'Electronics', icon: Laptop, count: 'Laptops, Earphones, Chargers' },
    { name: 'ID Cards', icon: CreditCard, count: 'College IDs, Transit Passes' },
    { name: 'Keys & Wallets', icon: Key, count: 'Dorm Keys, Wallets, Cards' },
    { name: 'Books', icon: Book, count: 'Textbooks, Notes, Calculators' },
    { name: 'Bottles & Bags', icon: Package, count: 'Backpacks, Flasks, Umbrellas' },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white">
        {/* Ambient glow background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-blue-600/15 blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>SST Campus Safety &amp; Property Recovery Network</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            Reconnecting You With What Matters{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300">
              Across Campus
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mt-4 font-normal leading-relaxed">
            Lost your college ID, laptop charger, or dorm keys? Found someone’s belongings? Report it securely, verify ownership with zero fraud, and coordinate safe returns.
          </p>

          {/* Search Box in Hero */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 max-w-2xl mx-auto flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl focus-within:border-blue-400 focus-within:bg-white/15 transition"
          >
            <div className="pl-3.5 text-slate-300">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent border-0 px-3 py-2.5 text-sm text-white focus:outline-none"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-500/30 shrink-0"
            >
              Search Items
            </button>
          </form>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/report?type=lost"
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-105 transition transform"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              I Lost Something
            </Link>
            <Link
              to="/report?type=found"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 transition transform"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              I Found Something
            </Link>
            <Link
              to="/browse"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm flex items-center gap-2 transition"
            >
              <Compass className="w-4 h-4" />
              Browse All
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
            <div className="text-center p-3">
              <span className="block text-2xl sm:text-3xl font-extrabold text-white">
                {stats.totalReports}
              </span>
              <span className="text-xs text-slate-400 font-medium">Total Reports</span>
            </div>
            <div className="text-center p-3 border-l border-white/10">
              <span className="block text-2xl sm:text-3xl font-extrabold text-amber-400">
                {stats.lostCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">Lost Items</span>
            </div>
            <div className="text-center p-3 border-l border-white/10">
              <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {stats.foundCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">Found Items</span>
            </div>
            <div className="text-center p-3 border-l border-white/10">
              <span className="block text-2xl sm:text-3xl font-extrabold text-teal-400">
                {stats.resolvedCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">Returned Safely</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category Shortcuts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Explore Categories</h2>
            <p className="text-xs text-slate-500 mt-1">
              Find or report lost property based on item classification
            </p>
          </div>
          <Link
            to="/browse"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.name}
                to={`/browse?category=${encodeURIComponent(cat.name)}`}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{cat.count}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recently Reported Items */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Recently Reported on Campus
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time feed of property lost or discovered across campus zones
            </p>
          </div>
          <Link
            to="/browse"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            See all items <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-72 border border-slate-200 p-4 skeleton-shimmer"
              />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700">No reports right now</h3>
            <p className="text-xs text-slate-500 mt-1">
              Be the first to post a lost or found report!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.map((item) => (
              <ItemCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* How it Works Section */}
      <section className="bg-slate-100 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Safe &amp; Systematic
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              How SST Lost &amp; Found Works
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Engineered with privacy safeguards and two-step proof verification to eliminate fraud.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 font-extrabold text-lg flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base">Report With Secret Proof</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Post an item report with images, category, and location. Keep secret details (e.g. serial numbers or stickers) concealed from public view.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 font-extrabold text-lg flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base">Claim &amp; Verify Ownership</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Claimants provide specific proof answers. Finders or campus security match proof against secret details without revealing them to third parties.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 font-extrabold text-lg flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base">Safe Return &amp; Resolution</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Upon claim approval, contact details are unlocked safely, the item is handed over at campus security, and status transitions to Resolved.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
