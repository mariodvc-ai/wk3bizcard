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
  category_id: number;
  avatar_url?: string;
  categories: Category;
}

const EMPTY_FORM = {
  name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  category_id: "",
};

// =====================================================
// AVATAR HELPER — uses uploaded photo or DiceBear fallback
// =====================================================
function getAvatar(card: Card): string {
  if (card.avatar_url) return card.avatar_url;
  const seed = encodeURIComponent(card.name.trim().toLowerCase());
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
}

// =====================================================
// SORT HELPER — last name first, then first name
// =====================================================
function sortByName(a: Card, b: Card): number {
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
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
function BusinessCard({
  card,
  user,
  isEditing,
  editFormData,
  onEditClick,
  onEditChange,
  onSave,
  onCancelEdit,
  onAvatarUpload,
  onRemoveAvatar,
  uploadingAvatar,
}: {
  card: Card;
  user: any;
  isEditing: boolean;
  editFormData: any;
  onEditClick: () => void;
  onEditChange: (field: string, value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onAvatarUpload: (file: File) => void;
  onRemoveAvatar: () => void;
  uploadingAvatar: boolean;
}) {
  const category = card.categories;
  const inputId = `avatar-upload-${card.id}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-100 flex-shrink-0 bg-gray-50">
          <img
            src={getAvatar(card)}
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

      {/* Edit Form or Details */}
      {isEditing ? (
        <div className="space-y-2 mb-4">
          {/* Upload Photo — label triggers file input */}
          <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <label
              htmlFor={inputId}
              className={`cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                uploadingAvatar
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {uploadingAvatar ? "Uploading..." : "📷 Upload Photo"}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              disabled={uploadingAvatar}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAvatarUpload(file);
                e.target.value = "";
              }}
            />
            <span className="text-xs text-blue-500">
              {card.avatar_url
                ? "✓ Custom photo set"
                : "Max 40MB · JPG, PNG, GIF"}
            </span>
            {card.avatar_url && (
              <button
                onClick={onRemoveAvatar}
                className="ml-auto text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
              >
                ✕ Remove
              </button>
            )}
          </div>

          {/* Text Fields */}
          {["name", "title", "company", "email", "phone", "website"].map(
            (field) => (
              <input
                key={field}
                className="w-full text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                value={editFormData[field] ?? ""}
                onChange={(e) => onEditChange(field, e.target.value)}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              />
            ),
          )}

          {/* Save / Cancel */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onSave}
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-sm text-gray-600 flex-grow mb-5">
          <p className="font-semibold text-gray-800 uppercase tracking-wide text-xs italic mb-1">
            {card.company}
          </p>
          <span>📞 {card.phone}</span>
          <span className="truncate">📧 {card.email}</span>
          {card.website && (
            <a
              href={`https://${card.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline font-medium mt-1 inline-block"
            >
              🌐 Visit Website →
            </a>
          )}
          {user && (
            <button
              onClick={onEditClick}
              className="mt-3 text-[10px] bg-slate-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold uppercase hover:bg-blue-500 hover:text-white transition-colors self-start"
            >
              Edit Card
            </button>
          )}
        </div>
      )}

      {/* Category Badge */}
      <div className="pt-4 border-t border-gray-50">
        <span
          className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
          style={{
            backgroundColor: category ? category.color_bg : "#F3F4F6",
            color: category ? category.color_text : "#1F2937",
          }}
        >
          {category?.name ?? "Uncategorized"}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [user, setUser] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState<any>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<
    string | null
  >(null);

  // =====================================================
  // AUTH STATE LISTENER
  // =====================================================
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setUser(session?.user ?? null);
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
  // FETCH CARDS
  // =====================================================
  const fetchCards = useCallback(async () => {
    const { data, error } = await supabase.from("cards").select(`
      *,
      categories (
        id,
        name,
        color_bg,
        color_text
      )
    `);
    if (error) {
      setError("Failed to load cards. Please try again.");
      console.error("Supabase fetch error:", error);
    } else {
      const sorted = (data as Card[]).sort(sortByName);
      setCards(sorted);
      setLastUpdated(new Date());
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Real-time listener
  useEffect(() => {
    const channel = supabase
      .channel("cards-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => {
          fetchCards();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCards]);

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

  // =====================================================
  // IMAGE RESIZE HELPER — 40MB check + resize to 200x200 JPEG
  // =====================================================
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const MAX_BYTES = 40 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        reject(new Error("File is too large. Maximum size is 40MB."));
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const SIZE = 200;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported."));
          return;
        }
        const srcSize = Math.min(img.width, img.height);
        const srcX = (img.width - srcSize) / 2;
        const srcY = (img.height - srcSize) / 2;
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, SIZE, SIZE);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to process image."));
          },
          "image/jpeg",
          0.8,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image. Please try a different file."));
      };
      img.src = objectUrl;
    });
  };

  // =====================================================
  // AVATAR UPLOAD
  // =====================================================
  const handleAvatarUpload = async (cardId: number, file: File) => {
    setUploadingAvatar(true);
    try {
      let blob: Blob;
      try {
        blob = await resizeImage(file);
      } catch (resizeErr: any) {
        alert(resizeErr.message);
        return;
      }

      const filePath = `card-${cardId}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("BizCard_Image")
        .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        alert(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("BizCard_Image")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("cards")
        .update({ avatar_url: publicUrl })
        .eq("id", cardId);

      if (updateError) {
        alert(`Failed to save photo: ${updateError.message}`);
        return;
      }

      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, avatar_url: publicUrl } : c,
        ),
      );
    } catch (err) {
      alert("Something went wrong during upload.");
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // =====================================================
  // REMOVE AVATAR
  // =====================================================
  const handleRemoveAvatar = async (cardId: number): Promise<void> => {
    const { error } = await supabase
      .from("cards")
      .update({ avatar_url: null })
      .eq("id", cardId);
    if (error) {
      alert(`Failed to remove photo: ${error.message}`);
      return;
    }
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, avatar_url: undefined } : c)),
    );
  };

  // =====================================================
  // ADD CARD
  // =====================================================
  const handleAdd = async () => {
    const { name, title, company, email, phone, website, category_id } =
      addFormData;
    if (!name.trim()) return alert("Name is required.");
    setAdding(true);
    const { data, error } = await supabase
      .from("cards")
      .insert([
        {
          name,
          title,
          company,
          email,
          phone,
          website,
          category_id: category_id || null,
        },
      ])
      .select(`*, categories (id, name, color_bg, color_text)`)
      .single();
    if (error) {
      alert(`Add failed: ${error.message}`);
    } else {
      let newCard = data as Card;
      // If a photo was selected, upload it now that we have the card id
      if (pendingAvatarFile) {
        await handleAvatarUpload(newCard.id, pendingAvatarFile);
        setPendingAvatarFile(null);
        setPendingAvatarPreview(null);
      } else {
        setCards((prev) => [...prev, newCard].sort(sortByName));
      }
      setAddFormData(EMPTY_FORM);
      setShowAddForm(false);
    }
    setAdding(false);
  };

  // =====================================================
  // EDIT CARD
  // =====================================================
  const handleSave = async (id: number) => {
    const { name, title, company, email, phone, website } = editFormData;
    const { error } = await supabase
      .from("cards")
      .update({ name, title, company, email, phone, website })
      .eq("id", id);
    if (error) {
      alert(`Update failed: ${error.message}`);
    } else {
      setCards((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, ...editFormData } : c))
          .sort(sortByName),
      );
      setEditingId(null);
    }
  };

  // =====================================================
  // DERIVED: unique categories from loaded cards
  // =====================================================
  const categories: Category[] = Array.from(
    new Map(
      cards
        .filter((c) => c.categories)
        .map((c) => [c.categories.id, c.categories]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  // =====================================================
  // FILTERED CARDS
  // =====================================================
  const filteredCards = cards.filter((card) => {
    const matchesCategory =
      selectedCategory === "All" || card.categories?.name === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      card.name.toLowerCase().includes(q) ||
      card.title.toLowerCase().includes(q) ||
      card.company.toLowerCase().includes(q) ||
      card.email.toLowerCase().includes(q) ||
      card.phone.toLowerCase().includes(q) ||
      (card.website ?? "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

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
        {/* Auth Nav */}
        <nav className="flex justify-end mb-8">
          {user ? (
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
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 bg-white text-slate-700 px-6 py-2 rounded-full font-semibold shadow-sm border border-slate-300 hover:bg-slate-50 transition-all"
            >
              <img
                src="https://www.google.com/favicon.ico"
                className="w-4 h-4"
                alt="G"
              />
              Sign in with Google
            </button>
          )}
        </nav>

        {/* Header */}
        <header className="mb-6">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Business Card Directory
          </h1>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-gray-500 text-sm">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {filteredCards.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">
                {cards.length}
              </span>{" "}
              professionals — sorted by last name, then first name
            </p>
            {lastUpdated && (
              <p className="text-gray-400 text-xs">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          {user && (
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setAddFormData(EMPTY_FORM);
                setPendingAvatarFile(null);
                setPendingAvatarPreview(null);
              }}
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-sm hover:bg-blue-700 transition-all"
            >
              <span className="text-xl leading-none">
                {showAddForm ? "✕" : "+"}
              </span>
              {showAddForm ? "Cancel" : "Add Business Card"}
            </button>
          )}
        </header>

        {/* Add Card Form */}
        {user && showAddForm && (
          <div className="mb-10 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              New Business Card
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  label: "Name",
                  key: "name",
                  required: true,
                  placeholder: "Full Name",
                },
                { label: "Title", key: "title", placeholder: "Job Title" },
                {
                  label: "Company",
                  key: "company",
                  placeholder: "Company Name",
                },
                {
                  label: "Email",
                  key: "email",
                  placeholder: "email@example.com",
                  type: "email",
                },
                { label: "Phone", key: "phone", placeholder: "555-0100" },
              ].map(({ label, key, required, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {label}{" "}
                    {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={type || "text"}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={addFormData[key]}
                    onChange={(e) =>
                      setAddFormData({ ...addFormData, [key]: e.target.value })
                    }
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={addFormData.category_id}
                  onChange={(e) =>
                    setAddFormData({
                      ...addFormData,
                      category_id: e.target.value,
                    })
                  }
                >
                  <option value="">— Select a category —</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Website
                </label>
                <input
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={addFormData.website}
                  onChange={(e) =>
                    setAddFormData({ ...addFormData, website: e.target.value })
                  }
                  placeholder="example.com"
                />
              </div>
            </div>
            {/* Avatar Upload for New Card */}
            <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              {pendingAvatarPreview ? (
                <img
                  src={pendingAvatarPreview}
                  alt="Preview"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-300"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-400 text-xl">
                  📷
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="new-card-avatar"
                  className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-block"
                >
                  {pendingAvatarFile
                    ? "Change Photo"
                    : "Upload Photo (optional)"}
                </label>
                <input
                  id="new-card-avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingAvatarFile(file);
                      setPendingAvatarPreview(URL.createObjectURL(file));
                    }
                    e.target.value = "";
                  }}
                />
                {pendingAvatarFile && (
                  <button
                    onClick={() => {
                      setPendingAvatarFile(null);
                      setPendingAvatarPreview(null);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold text-left"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
              <span className="text-xs text-blue-400 ml-auto">Max 40MB</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-8 py-2.5 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
              >
                {adding ? "Saving..." : "Save Card"}
              </button>
            </div>
          </div>
        )}

        {/* Search Box */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, title, company, email, or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
          />
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
              selectedCategory === "All"
                ? "bg-gray-900 text-white border-gray-900 shadow"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border"
              style={
                selectedCategory === cat.name
                  ? {
                      backgroundColor: cat.color_bg,
                      color: cat.color_text,
                      borderColor: "transparent",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }
                  : {
                      backgroundColor: "#ffffff",
                      color: "#4B5563",
                      borderColor: "#E5E7EB",
                    }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCards.map((card) => (
            <BusinessCard
              key={card.id}
              card={card}
              user={user}
              isEditing={editingId === card.id}
              editFormData={editFormData}
              onEditClick={() => {
                setEditingId(card.id);
                setEditFormData({ ...card });
              }}
              onEditChange={(field, value) =>
                setEditFormData({ ...editFormData, [field]: value })
              }
              onSave={() => handleSave(card.id)}
              onCancelEdit={() => setEditingId(null)}
              onAvatarUpload={(file) => handleAvatarUpload(card.id, file)}
              onRemoveAvatar={() => handleRemoveAvatar(card.id)}
              uploadingAvatar={uploadingAvatar}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredCards.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🗂️</p>
            <p className="font-medium">
              {searchQuery
                ? `No cards match "${searchQuery}"${selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}.`
                : `No cards in the "${selectedCategory}" category yet.`}
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-400 text-xs">
          <p>🔴 Live — updates automatically when the database changes</p>
        </footer>
      </div>
    </div>
  );
}
