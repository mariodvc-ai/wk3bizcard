"use client";
export const dynamic = "force-dynamic";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const EMPTY_FORM = {
  name: "",
  title: "",
  business: "",
  email: "",
  phone: "",
  website: "",
  category_id: "",
};

export default function Page() {
  const [cards, setCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState<any>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    const fetchData = async () => {
      const [cardsRes, catsRes] = await Promise.all([
        supabase.from("cards").select("*"),
        supabase.from("categories").select("*"),
      ]);
      if (!catsRes.error && catsRes.data && !cardsRes.error && cardsRes.data) {
        const catMap = Object.fromEntries(
          catsRes.data.map((cat) => [cat.id, cat]),
        );
        const merged = cardsRes.data.map((card) => ({
          ...card,
          categories: catMap[card.category_id] ?? null,
        }));
        setCards(merged);
        setCategories(catsRes.data);
      }
      setLoading(false);
    };
    getUser();
    fetchData();
  }, []);

  const handleEditClick = (card: any) => {
    setEditingId(card.id);
    setEditFormData({ ...card });
  };

  const handleSave = async (id: string) => {
    const { name, title, business, email, phone, website } = editFormData;
    const { error } = await supabase
      .from("cards")
      .update({ name, title, business, email, phone, website })
      .eq("id", id);
    if (error) {
      alert(`Update failed: ${error.message}`);
    } else {
      setCards(cards.map((c) => (c.id === id ? { ...c, ...editFormData } : c)));
      setEditingId(null);
    }
  };

  const handleAdd = async () => {
    const cat =
      categories.find((c) => c.id === addFormData.category_id) ?? null;
    const { name, title, business, email, phone, website, category_id } =
      addFormData;
    if (!name.trim()) return alert("Name is required.");
    setAdding(true);
    const { data, error } = await supabase
      .from("cards")
      .insert([
        {
          name,
          title,
          business,
          email,
          phone,
          website,
          category_id: category_id || null,
        },
      ])
      .select(`*, categories (name, color_hex)`)
      .single();
    if (error) {
      alert(`Add failed: ${error.message}`);
    } else {
      setCards([...cards, { ...data, categories: cat }]);
      setAddFormData(EMPTY_FORM);
      setShowAddForm(false);
    }
    setAdding(false);
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500 font-medium">
        Loading Directory...
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
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

        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Professional Directory
          </h1>
          <p className="mt-4 text-xl text-slate-600">
            Connecting experts across {cards?.length || 0} unique businesses.
          </p>
          {user && (
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setAddFormData(EMPTY_FORM);
              }}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-sm hover:bg-blue-700 transition-all"
            >
              <span className="text-xl leading-none">
                {showAddForm ? "✕" : "+"}
              </span>
              {showAddForm ? "Cancel" : "Add Business Card"}
            </button>
          )}
        </header>

        {user && showAddForm && (
          <div className="mb-12 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
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
                  label: "Business",
                  key: "business",
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

        <div className="grid grid-cols-1 gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards?.map((card) => {
            const isEditing = editingId === card.id;
            const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${card.id}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            return (
              <div
                key={card.id}
                className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-xl"
              >
                <div
                  className="h-2 w-full"
                  style={{
                    backgroundColor: card.categories?.color_hex ?? "#94a3b8",
                  }}
                />
                <div className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 ring-2 ring-white shadow-sm">
                      <img
                        src={avatarUrl}
                        alt={card.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-sm"
                      style={{
                        backgroundColor:
                          card.categories?.color_hex ?? "#94a3b8",
                      }}
                    >
                      {card.categories?.name ?? "Uncategorized"}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="space-y-2 mb-4">
                      {[
                        "name",
                        "title",
                        "business",
                        "email",
                        "phone",
                        "website",
                      ].map((field) => (
                        <input
                          key={field}
                          className="w-full text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editFormData[field] ?? ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              [field]: e.target.value,
                            })
                          }
                          placeholder={
                            field.charAt(0).toUpperCase() + field.slice(1)
                          }
                        />
                      ))}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSave(card.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        {card.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-500 italic">
                        {card.title}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700 uppercase tracking-tight">
                        {card.business}
                      </p>
                      {user && (
                        <button
                          onClick={() => handleEditClick(card)}
                          className="mt-3 text-[10px] bg-slate-50 text-blue-600 px-2 py-1 rounded border border-blue-100 font-bold uppercase hover:bg-blue-500 hover:text-white transition-colors"
                        >
                          Edit Card
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mt-auto space-y-2 pt-4 border-t border-slate-50">
                    <p className="flex items-center text-xs text-slate-600 truncate">
                      <span className="mr-2 text-slate-400">✉</span>{" "}
                      {card.email}
                    </p>
                    <p className="flex items-center text-xs text-slate-600">
                      <span className="mr-2 text-slate-400">📞</span>{" "}
                      {card.phone}
                    </p>
                    <a
                      href={`https://${card.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center text-xs text-blue-500 font-medium"
                    >
                      <span className="mr-2 opacity-70">🌐</span> {card.website}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
