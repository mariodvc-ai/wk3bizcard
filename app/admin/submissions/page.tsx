"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";

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
  avatar_url?: string;
  status: string;
  created_at: string;
  categories: Category;
}

// =====================================================
// AVATAR HELPER
// =====================================================
function getAvatar(card: Card): string {
  if (card.avatar_url) return card.avatar_url;
  const seed = encodeURIComponent(card.name.trim().toLowerCase());
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
}

// =====================================================
// ADMIN SUBMISSIONS PAGE
// =====================================================
export default function AdminSubmissionsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Card[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const [processing, setProcessing] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // =====================================================
  // TOAST HELPER
  // =====================================================
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // =====================================================
  // AUTH STATE LISTENER
  // =====================================================
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // =====================================================
  // FETCH SUBMISSIONS
  // =====================================================
  const fetchSubmissions = useCallback(async () => {
    const { data, error } = await supabase
      .from("cards")
      .select(
        `
        *,
        categories (
          id,
          name,
          color_bg,
          color_text
        )
      `,
      )
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Failed to load submissions.", "error");
    } else {
      setSubmissions(data as Card[]);
    }
  }, [filter]);

  useEffect(() => {
    if (user) fetchSubmissions();
  }, [user, fetchSubmissions]);

  // =====================================================
  // APPROVE CARD
  // =====================================================
  const handleApprove = async (id: number) => {
    setProcessing(id);
    const { error } = await supabase
      .from("cards")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) {
      showToast("Failed to approve card.", "error");
    } else {
      showToast("Card approved and added to directory! ✅");
      setSubmissions((prev) => prev.filter((c) => c.id !== id));
    }
    setProcessing(null);
  };

  // =====================================================
  // REJECT CARD
  // =====================================================
  const handleReject = async (id: number) => {
    setProcessing(id);
    const { error } = await supabase
      .from("cards")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) {
      showToast("Failed to reject card.", "error");
    } else {
      showToast("Card rejected. ❌");
      setSubmissions((prev) => prev.filter((c) => c.id !== id));
    }
    setProcessing(null);
  };

  // =====================================================
  // DELETE CARD
  // =====================================================
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this card?"))
      return;
    setProcessing(id);
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) {
      showToast("Failed to delete card.", "error");
    } else {
      showToast("Card permanently deleted.");
      setSubmissions((prev) => prev.filter((c) => c.id !== id));
    }
    setProcessing(null);
  };

  // =====================================================
  // AUTH ACTIONS
  // =====================================================
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ---- LOADING STATE ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ---- NOT LOGGED IN ----
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm w-full">
          <p className="text-2xl mb-2">🔒</p>
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">
            Admin Access Only
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            You must be signed in to view this page.
          </p>
          <button
            onClick={handleLogin}
            className="flex items-center justify-center gap-2 w-full bg-white text-slate-700 px-6 py-2.5 rounded-full font-semibold shadow-sm border border-slate-300 hover:bg-slate-50 transition-all"
          >
            <img
              src="https://www.google.com/favicon.ico"
              className="w-4 h-4"
              alt="G"
            />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // ---- MAIN RENDER ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Nav */}
        <nav className="flex justify-between items-center mb-8">
          <a
            href="/"
            className="text-sm text-blue-500 hover:underline font-medium"
          >
            ← Back to Directory
          </a>
          <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-full shadow-sm border border-slate-200">
            <span className="text-sm font-medium text-slate-700">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
            >
              Sign Out
            </button>
          </div>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Review, approve, or reject submitted business cards.
          </p>
        </header>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8">
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                filter === tab
                  ? tab === "pending"
                    ? "bg-amber-500 text-white border-transparent shadow"
                    : tab === "approved"
                      ? "bg-green-600 text-white border-transparent shadow"
                      : "bg-red-500 text-white border-transparent shadow"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        {submissions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">No {filter} submissions.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {submissions.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-6"
              >
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-100 flex-shrink-0 bg-gray-50">
                  <img
                    src={getAvatar(card)}
                    alt={`Avatar for ${card.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h2 className="text-lg font-bold text-gray-900">
                      {card.name}
                    </h2>
                    {card.categories && (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          backgroundColor: card.categories.color_bg,
                          color: card.categories.color_text,
                        }}
                      >
                        {card.categories.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-blue-600 font-medium">
                    {card.title}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-0.5">
                    {card.company}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    <span>📧 {card.email}</span>
                    <span>📞 {card.phone}</span>
                    {card.website && <span>🌐 {card.website}</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Submitted: {new Date(card.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {filter === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(card.id)}
                        disabled={processing === card.id}
                        className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {processing === card.id ? "..." : "✅ Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(card.id)}
                        disabled={processing === card.id}
                        className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {processing === card.id ? "..." : "❌ Reject"}
                      </button>
                    </>
                  )}
                  {filter === "approved" && (
                    <button
                      onClick={() => handleReject(card.id)}
                      disabled={processing === card.id}
                      className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {processing === card.id ? "..." : "❌ Reject"}
                    </button>
                  )}
                  {filter === "rejected" && (
                    <button
                      onClick={() => handleApprove(card.id)}
                      disabled={processing === card.id}
                      className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {processing === card.id ? "..." : "✅ Approve"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(card.id)}
                    disabled={processing === card.id}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
