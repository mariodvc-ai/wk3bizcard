"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// =====================================================
// INTERFACES
// =====================================================
interface Category {
  id: number;
  name: string;
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
// SUBMIT PAGE — public, no login required
// =====================================================
export default function SubmitPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories for dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (data) setCategories(data as Category[]);
    };
    fetchCategories();
  }, []);

  // =====================================================
  // IMAGE RESIZE — 2MB check + resize to 400x400 JPEG
  // =====================================================
  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const MAX_BYTES = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_BYTES) {
        reject(
          new Error("Photo must be under 2MB. Please choose a smaller file."),
        );
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const SIZE = 400;
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
          0.85,
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
  // HANDLE PHOTO SELECTION
  // =====================================================
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be under 2MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
    e.target.value = "";
  };

  // =====================================================
  // HANDLE SUBMIT
  // =====================================================
  const handleSubmit = async () => {
    const { name, title, company, email, phone, category_id } = formData;

    // Basic validation
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!category_id) {
      setError("Please select a category.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Step 1 — Insert card with status = pending
      const { data: newCard, error: insertError } = await supabase
        .from("cards")
        .insert([
          {
            name: name.trim(),
            title: title.trim(),
            company: company.trim(),
            email: email.trim(),
            phone: phone.trim(),
            website: formData.website.trim(),
            category_id: category_id || null,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (insertError) {
        setError(`Submission failed: ${insertError.message}`);
        return;
      }

      // Step 2 — Upload photo if provided
      if (photoFile && newCard) {
        try {
          const blob = await resizeImage(photoFile);
          const filePath = `card-${newCard.id}-${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("BizCard_Image")
            .upload(filePath, blob, {
              upsert: true,
              contentType: "image/jpeg",
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("BizCard_Image")
              .getPublicUrl(filePath);
            await supabase
              .from("cards")
              .update({ avatar_url: urlData.publicUrl })
              .eq("id", newCard.id);
          }
        } catch (resizeErr: any) {
          // Photo failed but card was submitted — non-fatal
          console.warn("Photo upload failed:", resizeErr.message);
        }
      }

      // Step 3 — Send email notification via Resend
      const selectedCategory = categories.find(
        (c) => String(c.id) === String(category_id),
      );
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          title: formData.title,
          company: formData.company,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          category: selectedCategory?.name ?? "Unknown",
        }),
      });

      // Step 4 — Show success
      setSubmitted(true);
      setFormData(EMPTY_FORM);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // SUCCESS STATE
  // =====================================================
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
            Submission Received!
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Your business card has been submitted for review. You will appear in
            the directory once it has been approved.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
            >
              Submit Another Card
            </button>
            <a
              href="/"
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              Back to Directory
            </a>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN FORM
  // =====================================================
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            Submit Your Business Card
          </h1>
          <p className="text-gray-500 text-sm">
            Fill out the form below and your card will appear in the directory
            after review.
          </p>
          <a
            href="/"
            className="inline-block mt-4 text-xs text-blue-500 hover:underline"
          >
            ← Back to Directory
          </a>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {/* Photo Upload */}
          <div className="flex items-center gap-6 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-300 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-3xl flex-shrink-0">
                📷
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Profile Photo{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </p>
              <label
                htmlFor="photo-upload"
                className="cursor-pointer inline-block text-xs font-semibold px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {photoFile ? "Change Photo" : "Upload Photo"}
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={handlePhotoChange}
              />
              {photoFile && (
                <button
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="ml-3 text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  ✕ Remove
                </button>
              )}
              <p className="text-xs text-gray-400 mt-1">PNG or JPG · Max 2MB</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                label: "Full Name",
                key: "name",
                required: true,
                placeholder: "Jane Smith",
              },
              {
                label: "Job Title",
                key: "title",
                placeholder: "Software Engineer",
              },
              { label: "Company", key: "company", placeholder: "Acme Corp" },
              {
                label: "Email",
                key: "email",
                required: true,
                placeholder: "jane@example.com",
                type: "email",
              },
              { label: "Phone", key: "phone", placeholder: "555-0100" },
            ].map(({ label, key, required, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={type || "text"}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData[key as keyof typeof formData]}
                  onChange={(e) =>
                    setFormData({ ...formData, [key]: e.target.value })
                  }
                  placeholder={placeholder}
                />
              </div>
            ))}

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
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

            {/* Website */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Website
              </label>
              <input
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="example.com"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">⚠️ {error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 flex justify-end gap-3">
            <a
              href="/"
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Cancel
            </a>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-2.5 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your submission will be reviewed before appearing in the directory.
        </p>
      </div>
    </div>
  );
}
