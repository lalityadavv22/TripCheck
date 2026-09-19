import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Destination } from '../types';
import { Star, ChevronLeft, ChevronRight, Play, Info, Sparkles, Plus, Flame } from 'lucide-react';

interface NetflixCarouselsProps {
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
  onOpenAIArchitect: (dest?: Destination) => void;
}

export const NetflixCarousels: React.FC<NetflixCarouselsProps> = ({
  destinations,
  onSelectDestination,
  onOpenAIArchitect,
}) => {
  const featured = destinations[0] || null;

  const categories = [
    { title: '🔥 Top Trending Voyages', filter: (d: Destination) => d.matchScore >= 95 },
    { title: '🏔️ Alpine & Glacial Escapes', filter: (d: Destination) => d.category === 'Alpine Escapes' || d.category === 'Nordic Wilderness' },
    { title: '⚡ Cyberpunk & Neon Metropolises', filter: (d: Destination) => d.category === 'Neon Cyberpunk Cities' },
    { title: '🌴 Tropical Sanctuaries', filter: (d: Destination) => d.category === 'Tropical Sanctuaries' || d.category === 'Trending' },
  ];

  const CarouselRow: React.FC<{ title: string; items: Destination[] }> = ({ title, items }) => {
    const rowRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
      if (!rowRef.current) return;
      const offset = direction === 'left' ? -420 : 420;
      rowRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    };

    return (
      <div className="mb-10 group relative">
        <div className="flex items-center justify-between px-6 mb-3">
          <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
              {items.length} spots
            </span>
          </h3>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-200">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable track */}
        <div
          ref={rowRef}
          className="flex items-center gap-4 overflow-x-auto px-6 py-2 no-scrollbar scroll-smooth"
        >
          {items.map((dest, idx) => (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ scale: 1.03, y: -4 }}
              onClick={() => onSelectDestination(dest)}
              className="relative shrink-0 w-64 sm:w-80 group/card rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-cyan-500/60 transition-colors duration-300 cursor-pointer shadow-lg hover:shadow-cyan-500/20"
            >
              <div className="relative h-44 sm:h-48 w-full overflow-hidden">
                <img
                  src={dest.heroImage}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Match score pill */}
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-emerald-500/40 text-[11px] font-bold text-emerald-400">
                  {dest.matchScore}% Match
                </div>

                {/* Rating badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[11px] font-bold text-amber-300">
                  <Star className="w-3 h-3 fill-amber-300" />
                  <span>{dest.rating}</span>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold uppercase mb-1">
                  <span>{dest.country}</span>
                  <span className="text-slate-400 font-normal">${dest.estimatedBudgetPerDay}/day</span>
                </div>
                <h4 className="text-lg font-bold text-white group-hover/card:text-cyan-300 transition-colors line-clamp-1">
                  {dest.name}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {dest.tagline}
                </p>

                <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Season: <strong className="text-slate-200">{dest.bestSeason.split(' ')[0]}</strong></span>
                  <span className="flex items-center gap-1 text-cyan-400 font-medium">
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Netflix-style Cinematic Hero Billboard */}
      {featured && (
        <div className="relative w-full h-[460px] sm:h-[540px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mb-8">
          <img
            src={featured.heroImage}
            alt={featured.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

          {/* Featured Content overlay */}
          <div className="absolute bottom-8 left-6 sm:left-12 max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-cyan-400" />
                #1 Curated Spotlight
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                {featured.matchScore}% Match
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none drop-shadow-md">
              {featured.name}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed drop-shadow line-clamp-3">
              {featured.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onSelectDestination(featured)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-cyan-500/30 transition duration-200 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Explore Destination</span>
              </button>

              <button
                onClick={() => onOpenAIArchitect(featured)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600/90 hover:bg-purple-600 text-white font-bold text-sm backdrop-blur-md border border-purple-400/30 shadow-xl shadow-purple-900/30 transition duration-200 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>AI Travel Architect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categorized Rows */}
      {categories.map((cat, idx) => {
        const filtered = destinations.filter(cat.filter);
        if (filtered.length === 0) return null;
        return <CarouselRow key={idx} title={cat.title} items={filtered} />;
      })}
    </div>
  );
};
