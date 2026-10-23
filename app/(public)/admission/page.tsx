"use client";
import { useState } from "react";
import { API_BASE } from "@/lib/api";

async function compressImageFile(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  if (file.size < 250 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressed);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export default function AdmissionPage() {
  const [form, setForm] = useState({ fullName: "", email: "", whatsapp: "", enrollmentNo: "", branch: "", year: "", address: "", parentMobile: "", domain: "", reason: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!photo) {
      setError("Please upload your student photo.");
      return;
    }
    if (!idCard) {
      setError("Please upload your college ID card.");
      return;
    }

    if (photo.size > 10 * 1024 * 1024) {
      setError("Student photo must be under 10MB.");
      return;
    }
    if (idCard.size > 10 * 1024 * 1024) {
      setError("College ID card must be under 10MB.");
      return;
    }

    setLoading(true);
    setStatusMessage("Optimizing images...");

    try {
      const [optimizedPhoto, optimizedIdCard] = await Promise.all([
        compressImageFile(photo),
        compressImageFile(idCard),
      ]);

      setStatusMessage("Uploading application & documents...");

      const formData = new FormData();
      formData.append("full_name", form.fullName);
      formData.append("email", form.email);
      formData.append("whatsapp", form.whatsapp);
      formData.append("enrollment_no", form.enrollmentNo);
      formData.append("branch", form.branch);
      formData.append("year", form.year);
      formData.append("address", form.address);
      formData.append("parent_mobile", form.parentMobile);
      formData.append("domain", form.domain);
      formData.append("reason", form.reason);
      formData.append("photo", optimizedPhoto);
      formData.append("id_card", optimizedIdCard);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`${API_BASE}/admission`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Submission failed. Please try again.");
      }

      setSubmitted(true);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Upload timed out. Please check your internet connection and try again.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md bg-white p-10 rounded-2xl shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">Our team will review your application within 2-3 days and notify you via email. Only 29 seats available — serious applicants get priority.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-100 text-blue-700 text-sm px-4 py-1 rounded-full mb-4">29 Free Seats — College Students Only</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply for Free Seat</h1>
          <p className="text-gray-500 text-sm">Fill in all details carefully — incomplete forms will not be considered</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" name="fullName" value={form.fullName} onChange={handleChange} required placeholder="Your full name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email ID * <span className="text-gray-400 font-normal">(login credentials will be sent here)</span></label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="your@email.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number *</label>
              <input type="tel" name="whatsapp" value={form.whatsapp} onChange={handleChange} required placeholder="+91 XXXXXXXXXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent's Mobile *</label>
              <input type="tel" name="parentMobile" value={form.parentMobile} onChange={handleChange} required placeholder="+91 XXXXXXXXXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment No. *</label>
              <input type="text" name="enrollmentNo" value={form.enrollmentNo} onChange={handleChange} required placeholder="XXXXXXXXXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <input type="text" name="branch" value={form.branch} onChange={handleChange} required placeholder="CSE, IT..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <select name="year" value={form.year} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                <option value="">Select</option>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain of Interest *</label>
            <select name="domain" value={form.domain} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">Choose your career path</option>
              <option>Full Stack Developer</option>
              <option>Python Developer</option>
              <option>UI / UX Design</option>
              <option>Data Science</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <textarea name="address" value={form.address} onChange={handleChange} required rows={2} placeholder="Your full address" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Why should we select you? * <span className="text-gray-400 font-normal">(100-200 words)</span></label>
            <textarea name="reason" value={form.reason} onChange={handleChange} required rows={4} placeholder="Tell us about your motivation, goals, and commitment..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo * <span className="text-gray-400 font-normal">(JPG/PNG, max 2MB)</span></label>
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {photo && <img src={URL.createObjectURL(photo)} alt="Preview" className="mt-3 w-20 h-20 object-cover rounded-xl border border-gray-200" />}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College ID Card * <span className="text-gray-400 font-normal">(JPG/PNG/PDF, max 5MB)</span></label>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setIdCard(e.target.files?.[0] || null)} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {idCard && <p className="text-xs text-green-600 mt-2">✅ {idCard.name} selected</p>}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {statusMessage || "Submitting…"}
              </>
            ) : (
              "Submit Application"
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">Only 29 seats available — serious applicants get priority. Results within 2-3 days.</p>
        </form>
      </div>
    </div>
  );
}
