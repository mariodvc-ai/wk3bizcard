'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// =====================================================
// INTERFACES
// =====================================================
interface Category {
  id: number;
  name: string;
  color_bg: string;
  color_text: string;
}

interface Card {
  id: number;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  website?: string;
  category_id: number;
  categories: Category;
}

// =====================================================
// AVATAR HELPER (DiceBear Personas)
// =====================================================
function getAvatar(name: string): string {
  const seed = encodeURIComponent(name.trim().toLowerCase());
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
}

// =====================================================
// SORT HELPER — last name first, then first name
// =====================================================
function sortByName(a: Card, b: Card): number {
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    const last = parts[parts.length - 1];
    const first = parts[0];
    return { last, first };
  };
  const nameA = splitName(a.name);
  const nameB = splitName(b.name);
  const lastCmp = nameA.last.localeCompare(nameB.last);
  if (lastCmp !== 0) return lastCmp;
  return nameA.first.localeCompare(nameB.first);
}

// =====================================================
// BUSINESS CARD COMPONENT
// =====================================================
function BusinessCard({ card }: { card: Card }) {
  const category = card.categories;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl">

      {/* Avatar + Name */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-100 flex-shrink-0 bg-gray-50">
          <img
            src={getAvatar(card.name)}
            alt={`Avatar for ${card.name}`}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {card.name}
          </h2>
          <p className="text-sm font-medium text-blue-600">{card.title}</p>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1 text-sm text-gray-600 flex-grow mb-5">
        <p className="font-semibold text-gray-800 uppercase tracking-wide text-xs italic mb-1">
          {card.company}
        </p>
        <span>📞 {card.phone}</span>
        <span className="truncate">📧 {card.email}</span>
        {card.website && (
          <a
            href={card.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline font-medium mt-1 inline-block"
          >
            🌐 Visit Website →
          </a>
        )}
      </div>

      {/* Category Badge */}
      <div className="pt-4 border-t border-gray-50">
        <span
          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
            category
              ? `${category.color_bg} ${category.color_text}`
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {category?.name ?? 'Uncategorized'}
        </span>
      </div>

    </div>
  );
}

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================
export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch cards from Supabase
  const fetchCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        categories (
          id,
          name,
          color_bg,
          color_text
        )
      `);

    if (error) {
      setError('Failed to load cards. Please try again.');
      console.error('Supabase fetch error:', error);
    } else {
      const sorted = (data as Card[]).sort(sortByName);
      setCards(sorted);
      setLastUpdated(new Date());
      setError(null);
    }
    setLoading(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Real-time listener — re-fetches on any change to cards table
  useEffect(() => {
    const channel = supabase
      .channel('cards-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        () => {
          fetchCards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCards]);

  // ---- LOADING STATE ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading business cards...</p>
        </div>
      </div>
    );
  }

  // ---- ERROR STATE ----
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white rounded-2xl p-8 shadow border border-red-100">
          <p className="text-red-500 font-semibold mb-2">⚠️ {error}</p>
          <button
            onClick={fetchCards}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---- MAIN RENDER ----
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Business Card Directory
          </h1>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-gray-500 text-sm">
              Showing <span className="font-semibold text-gray-700">{cards.length}</span> professionals
              — sorted by last name, then first name
            </p>
            {lastUpdated && (
              <p className="text-gray-400 text-xs">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </header>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card) => (
            <BusinessCard key={card.id} card={card} />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-400 text-xs">
          <p>🔴 Live — updates automatically when the database changes</p>
        </footer>

      </div>
    </div>
  );
}