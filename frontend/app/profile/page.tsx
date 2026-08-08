"use client";

import { useEffect, useState, useCallback } from "react";
import ProtectedShell from "@/components/ProtectedShell";
import { api } from "@/lib/api";
import {
  User,
  Briefcase,
  FileText,
  Lock,
  Building2,
  FolderKanban,
  Upload,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Save,
  KeyRound,
  Mail,
} from "lucide-react";

interface ProjectMembershipInfo {
  project_id: string;
  project_name: string;
  project_key: string | null;
  project_role: string;
}

interface UserProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_id: string | null;
  company_name: string | null;
  role: string | null;
  company_role: string | null;
  designation: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_completed: boolean;
  is_active: boolean;
  is_verified: boolean;
  project_memberships: ProjectMembershipInfo[];
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
];

export default function MyProfilePage() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/me");
      const data: UserProfileData = res.data.data;
      setProfile(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setDesignation(data.designation || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || PRESET_AVATARS[0]);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Please select a valid image file (.png, .jpg, .webp).");
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      const res = await api.patch("/auth/profile", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        designation: designation.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      setProfile(res.data.data);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    try {
      await api.post("/auth/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || "Failed to change password. Check your current password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const isCustomUploaded = !PRESET_AVATARS.includes(avatarUrl);

  return (
    <ProtectedShell pageTitle="My Profile">
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}

        {!loading && profile && (
          <>
            {/* Header Profile Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl || PRESET_AVATARS[0]}
                    alt="User Avatar"
                    className="size-20 rounded-full object-cover border-2 border-primary shadow-sm"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-foreground">
                    {profile.first_name} {profile.last_name}
                  </h2>
                  <p className="text-sm font-medium text-primary mt-0.5">
                    {profile.designation || "Member"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Mail className="size-3.5 shrink-0" />
                    {profile.email}
                  </p>
                </div>
              </div>

              {/* Company Role Pill */}
              <div className="flex items-center gap-2">
                {profile.company_name && (
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {profile.company_name} ({profile.company_role || "MEMBER"})
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Columns: Editable Personal Info & Security */}
              <div className="lg:col-span-2 space-y-8">
                {/* Personal Information Card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <User className="size-5 text-primary" /> Personal Information
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Update your display name, designation, avatar, and bio.
                    </p>
                  </div>

                  {profileSuccess && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Profile updated successfully!</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    {/* Avatar Selection */}
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-2">
                        Profile Avatar Picture
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
                        <label className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isCustomUploaded ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}>
                          <Upload className="size-4" />
                          <span>{isCustomUploaded ? "Custom Uploaded" : "Upload Image from PC"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>

                    {/* First & Last Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-foreground">
                          Email Address
                        </label>
                        <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Lock className="size-3" /> Read-Only
                        </span>
                      </div>
                      <input
                        type="email"
                        disabled
                        value={profile.email}
                        className="w-full rounded-xl border border-border/80 bg-muted/50 px-3.5 py-2 text-xs text-muted-foreground cursor-not-allowed"
                      />
                      <p className="text-[0.68rem] text-muted-foreground mt-1">
                        Primary account email — changes require administrative verification.
                      </p>
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Designation / Job Title
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g. Senior Frontend Engineer"
                          className="w-full rounded-xl border border-border bg-background pl-10 pr-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    {/* Short Bio */}
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Short Professional Bio
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                        <textarea
                          rows={3}
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Brief description of your expertise and role..."
                          className="w-full rounded-xl border border-border bg-background pl-10 pr-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                    >
                      {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save Profile Changes
                    </button>
                  </form>
                </div>

                {/* Password & Security Card */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <KeyRound className="size-5 text-primary" /> Password & Security
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Update your account security password.
                    </p>
                  </div>

                  {passwordSuccess && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Password changed successfully!</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/95 disabled:opacity-50 cursor-pointer"
                    >
                      {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                      Update Password
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Read-Only Workspace Memberships */}
              <div className="space-y-6">
                {/* Organization Details */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-3">
                    <Building2 className="size-4 text-primary" /> Company Membership
                  </h3>

                  <div>
                    <span className="text-[0.68rem] text-muted-foreground uppercase font-bold tracking-wider block">
                      Organization
                    </span>
                    <span className="text-sm font-extrabold text-foreground">
                      {profile.company_name || "Unassigned"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[0.68rem] text-muted-foreground uppercase font-bold tracking-wider block">
                      Company Role
                    </span>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 mt-1">
                      {profile.company_role || "MEMBER"}
                    </span>
                  </div>
                </div>

                {/* Assigned Projects */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <FolderKanban className="size-4 text-primary" /> Assigned Projects
                    </h3>
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {profile.project_memberships.length}
                    </span>
                  </div>

                  {profile.project_memberships.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No project memberships assigned yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {profile.project_memberships.map((pm) => (
                        <div
                          key={pm.project_id}
                          className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              {pm.project_name}
                            </span>
                            {pm.project_key && (
                              <span className="text-[0.65rem] font-extrabold text-muted-foreground uppercase tracking-wider block mt-0.5">
                                Key: {pm.project_key}
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[0.65rem] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {pm.project_role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedShell>
  );
}
