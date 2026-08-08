"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Briefcase, FileText, Sparkles, Loader2, Check, AlertCircle, Upload, Image as ImageIcon } from "lucide-react";

interface CompleteProfileModalProps {
  initialDesignation?: string | null;
  initialBio?: string | null;
  initialAvatarUrl?: string | null;
  userName: string;
  onProfileCompleted: () => void;
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
];

export default function CompleteProfileModal({
  initialDesignation = "",
  initialBio = "",
  initialAvatarUrl = "",
  userName,
  onProfileCompleted,
}: CompleteProfileModalProps) {
  const [designation, setDesignation] = useState(initialDesignation || "");
  const [bio, setBio] = useState(initialBio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || PRESET_AVATARS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (.png, .jpg, .webp).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim()) {
      setErrorMsg("Designation / Job Title is required.");
      return;
    }
    if (!bio.trim()) {
      setErrorMsg("A short bio is required to complete your profile.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.patch("/auth/profile", {
        designation: designation.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      onProfileCompleted();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCustomUploaded = !PRESET_AVATARS.includes(avatarUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">Welcome, {userName}! 👋</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Please complete your member profile before accessing workspace projects & dashboards.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Choose Profile Avatar or Upload Custom Image
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`relative rounded-full border-2 overflow-hidden transition-all cursor-pointer ${
                    avatarUrl === url
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Avatar ${idx + 1}`} className="size-11 object-cover" />
                  {avatarUrl === url && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="size-4 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}

              {/* Upload Custom PC File Button */}
              <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                isCustomUploaded ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}>
                <Upload className="size-3.5" />
                <span>{isCustomUploaded ? "Custom Uploaded" : "Upload from PC"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Designation */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Designation / Job Title <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer, Project Manager"
                className="w-full rounded-xl border border-border bg-background pl-10 pr-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Short Bio */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Short Professional Bio <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <textarea
                required
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your team about your expertise, technical focus, or project role..."
                className="w-full rounded-xl border border-border bg-background pl-10 pr-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Check className="size-4" /> Complete Profile & Enter Workspace
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
