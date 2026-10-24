import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Mic,
  Activity,
  User,
  ShieldCheck,
  Key,
  Trash2,
  Mail,
  HelpCircle,
  Globe,
  Heart,
  Camera,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/Components/card";
import { Button } from "@/Components/button";
import { Badge } from "@/Components/badge";
import { Input } from "@/Components/input";
import { api, ApiError } from "../Services/authService";
import { useAuth } from "../Providers/AuthProvider";
import { clearTeamsCache, fetchAllTeams } from "../Services/teamsService";
import type { ClubTeam, LanguageCode, PersonaCode } from "../types";

type ModalType =
  | null
  | "username"
  | "email"
  | "password"
  | "verify_email"
  | "forgot_password"
  | "delete_account"
  | "language"
  | "favorites";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  es: "Español (Spanish)",
  pt: "Português (Portuguese)",
  gr: "Ελληνικά (Greek)",
};

const BASE_CARD_CLASSES =
  "bg-slate-900 border-2 border-slate-700 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] rounded-2xl";
const SECURITY_GROUP_CLASSES =
  "flex flex-col gap-4 p-4 sm:p-5 bg-slate-950/50 border-2 border-slate-800 rounded-2xl";

export function SettingsPage() {
  const { user, logout, patchUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [teamsList, setTeamsList] = useState<ClubTeam[]>([]);

  useEffect(() => {
    fetchAllTeams()
      .then(setTeamsList)
      .catch(() => {});
  }, []);

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(
    (user?.preferences?.language as LanguageCode) || "en",
  );
  const [favoriteTeamInput, setFavoriteTeamInput] = useState(
    user?.preferences?.favorite_team ?? "",
  );
  const [favoritePlayerInput, setFavoritePlayerInput] = useState(
    user?.preferences?.favorite_player ?? "",
  );

  const selectedClubObj =
    teamsList.find((t) => t.name === favoriteTeamInput) || null;

  const [role, setRole] = useState<PersonaCode>(
    (user?.preferences?.persona as PersonaCode) || "casual",
  );
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [verifiedJustNow, setVerifiedJustNow] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isEmailVerified = Boolean(user?.email_verified) || verifiedJustNow;

  useEffect(() => {
    if (user?.preferences?.persona) {
      setRole(user.preferences.persona as PersonaCode);
    }
  }, [user?.preferences?.persona]);

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyEmailInput, setVerifyEmailInput] = useState(user?.email ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const closeModal = () => {
    setActiveModal(null);
    setFeedback(null);
    setOtpSent(false);
    setOtpVerified(false);
    setOtpCode("");
    setNewUsername("");
    setNewEmail("");
    setOldPassword("");
    setNewPassword("");
  };

  const finishWithToast = (message: string) => {
    closeModal();
    setToastMessage(message);
  };

  const extractError = (err: unknown) => {
    if (err instanceof ApiError) return err.message;
    if (axios.isAxiosError(err)) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && detail[0]?.msg) {
        return String(detail[0].msg).replace(/^Value error,\s*/i, "");
      }
    }
    return "Operation failed. Please try again.";
  };

  // 0. POST /api/account/avatar
  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/account/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      patchUser({ avatar_url: res.data.avatar_url }, false);
      setToastMessage(
        res.data.message || "Profile picture updated successfully",
      );
    } catch (err) {
      setToastMessage(extractError(err));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 0b. PATCH /api/account/preferences
  const handlePersonaChange = async (nextPersona: PersonaCode) => {
    if (nextPersona === role || busy) return;
    const previous = role;
    setRole(nextPersona);
    try {
      const res = await api.patch("/api/account/preferences", {
        persona: nextPersona,
      });
      patchUser({ preferences: res.data.preferences }, true);
    } catch (err) {
      setRole(previous);
      setToastMessage(extractError(err));
    }
  };

  const handleSaveLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.patch("/api/account/preferences", {
        language: selectedLanguage,
      });
      patchUser({ preferences: res.data.preferences }, true);
      finishWithToast(res.data.message || "Language updated successfully");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFavorites = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.patch("/api/account/preferences", {
        favorite_team: favoriteTeamInput.trim() || null,
        favorite_player: favoritePlayerInput.trim() || null,
      });
      clearTeamsCache();
      patchUser({ preferences: res.data.preferences }, true);
      finishWithToast(res.data.message || "Favorites updated successfully");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  // 1. PATCH /api/account/change-username
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const trimmed = newUsername.trim();
      const res = await api.patch("/api/account/change-username", {
        username: trimmed,
      });
      patchUser({ username: trimmed }, true);
      finishWithToast(res.data.message || "Username updated successfully");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  // 2. PATCH /api/account/change-email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const trimmed = newEmail.trim();
      const res = await api.patch("/api/account/change-email", {
        email: trimmed,
      });
      setVerifiedJustNow(false);
      patchUser({ email: trimmed, email_verified: false }, true);
      setVerifyEmailInput(trimmed);
      finishWithToast(res.data.message || "Email updated successfully");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  // 3. PATCH /api/account/change-password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.patch("/api/account/change-password", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      patchUser({}, true);
      finishWithToast(res.data.message || "Password updated successfully");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  // 4. POST /api/account/verify-email/request & /confirm
  const handleRequestVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.post("/api/account/verify-email/request", {
        email: verifyEmailInput.trim(),
      });
      setOtpSent(true);
      setFeedback({
        type: "success",
        text: res.data.message || "OTP sent to your email.",
      });
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.post("/api/account/verify-email/confirm", {
        otp: otpCode.trim(),
      });
      setVerifiedJustNow(true);
      patchUser({ email_verified: true }, false);
      finishWithToast(res.data.message || "Email successfully verified");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  // 5. 3-Step Forgot Password
  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.post("/api/auth/forgot-password/request", {
        email: verifyEmailInput.trim(),
      });
      setOtpSent(true);
      setFeedback({
        type: "success",
        text: res.data.message || "Enter the 6-digit OTP sent to your email.",
      });
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await api.post("/api/auth/forgot-password/verify", {
        email: verifyEmailInput.trim(),
        otp: otpCode.trim(),
      });
      setOtpVerified(true);
      setFeedback({
        type: "success",
        text: "OTP verified! Now enter your new password.",
      });
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api.post("/api/auth/forgot-password/reset", {
        email: verifyEmailInput.trim(),
        otp: otpCode.trim(),
        new_password: newPassword,
      });
      try {
        await api.post("/api/auth/login", {
          username_or_email: verifyEmailInput.trim(),
          password: newPassword,
        });
        await refreshUser();
      } catch {
        // Ignore if user chooses to log in manually later
      }
      finishWithToast(res.data.message || "Password successfully reset");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
    } finally {
      setBusy(false);
    }
  };

  // 6. DELETE /api/account/delete-account
  const handleDeleteAccount = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await api.delete("/api/account/delete-account");
      closeModal();
      await logout();
      navigate("/login");
    } catch (err) {
      setFeedback({ type: "error", text: extractError(err) });
      setBusy(false);
    }
  };

  const currentLangCode = (user?.preferences?.language as LanguageCode) || "en";
  const currentLangLabel = LANGUAGE_LABELS[currentLangCode] || "English";
  const currentTeam = user?.preferences?.favorite_team;
  const currentPlayer = user?.preferences?.favorite_player;
  const favoritesSubtitle =
    currentTeam || currentPlayer
      ? [currentTeam, currentPlayer].filter(Boolean).join(" • ")
      : "None selected";

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:py-14 lg:px-8 flex flex-col gap-8 sm:gap-10">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border-2 border-emerald-500 text-emerald-400 px-5 py-4 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.25)] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
          <span className="text-sm sm:text-base font-bold text-white">
            {toastMessage}
          </span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 border-b-2 border-slate-800 pb-6 sm:pb-8">
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wider">
          Settings
        </h1>
        <p className="text-slate-400 text-sm sm:text-base font-medium mt-1">
          Manage your identity, security, and broadcast preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Profile & Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="group flex flex-col items-center mb-6 relative cursor-pointer self-center bg-transparent border-none p-0"
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-slate-800 border-[3px] border-slate-600 group-hover:border-emerald-500 rounded-full flex items-center justify-center overflow-hidden relative transition-all duration-200">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-30"
                  />
                ) : (
                  <User className="w-12 h-12 sm:w-14 sm:h-14 text-slate-400 transition-opacity duration-200 group-hover:opacity-0" />
                )}
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-400" />
                </div>
              </div>
              <Badge
                variant="outline"
                className="absolute -bottom-3 shadow-md border-2 border-slate-700 bg-slate-800 text-slate-300 px-4 py-1 text-xs sm:text-sm whitespace-nowrap"
              >
                {avatarUploading ? "Uploading..." : "Edit Avatar"}
              </Badge>
            </button>

            <SettingAction
              icon={<User />}
              title="Change Username"
              subtitle={`Currently: ${user?.username ?? "Loading..."}`}
              onClick={() => setActiveModal("username")}
            />
          </CardContent>
        </Card>

        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">
              App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingAction
              icon={<Globe />}
              title="Change Language"
              subtitle={currentLangLabel}
              onClick={() => {
                setSelectedLanguage(currentLangCode);
                setActiveModal("language");
              }}
            />
            <SettingAction
              icon={<Heart />}
              title="Favorite Team / Player"
              subtitle={favoritesSubtitle}
              onClick={() => {
                setFavoriteTeamInput(user?.preferences?.favorite_team ?? "");
                setFavoritePlayerInput(
                  user?.preferences?.favorite_player ?? "",
                );
                setActiveModal("favorites");
              }}
            />
          </CardContent>
        </Card>

        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className={SECURITY_GROUP_CLASSES}>
              <SettingAction
                icon={<Mail />}
                title="Change Email"
                subtitle={
                  user?.email
                    ? `Currently: ${user.email}`
                    : "Update your contact address"
                }
                onClick={() => setActiveModal("email")}
              />
              <SettingAction
                icon={<ShieldCheck />}
                title="Verify Email"
                subtitle={
                  isEmailVerified ? "Status: Verified" : "Status: Unverified"
                }
                status={isEmailVerified ? "verified" : "warning"}
                onClick={() => {
                  if (isEmailVerified) return;
                  setVerifyEmailInput(user?.email ?? "");
                  setActiveModal("verify_email");
                }}
              />
            </div>

            <div className={SECURITY_GROUP_CLASSES}>
              <SettingAction
                icon={<Key />}
                title="Change Password"
                subtitle="Update your credentials"
                onClick={() => setActiveModal("password")}
              />
              <SettingAction
                icon={<HelpCircle />}
                title="Forgot Password"
                subtitle="Send a 6-digit OTP reset code"
                onClick={() => {
                  setVerifyEmailInput(user?.email ?? "");
                  setActiveModal("forgot_password");
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`${BASE_CARD_CLASSES} border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.08)]`}
        >
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-emerald-500 uppercase tracking-widest">
              Broadcast Persona
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm sm:text-base mt-1">
              Select how you want to receive live match updates on the
              dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <button
              type="button"
              onClick={() => handlePersonaChange("casual")}
              className={`relative flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                role === "casual"
                  ? "bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div
                className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "casual" ? "bg-emerald-500/20" : "bg-slate-700"}`}
              >
                <Mic
                  className={`w-6 h-6 ${role === "casual" ? "text-emerald-400" : "text-slate-400"}`}
                />
              </div>
              <div className="flex flex-col text-left pr-4">
                <span
                  className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "casual" ? "text-emerald-400" : "text-slate-300"}`}
                >
                  Casual Fan
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Emotion-driven commentary and basic play-by-play.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePersonaChange("analyst")}
              className={`relative flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                role === "analyst"
                  ? "bg-blue-950/40 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div
                className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "analyst" ? "bg-blue-500/20" : "bg-slate-700"}`}
              >
                <Activity
                  className={`w-6 h-6 ${role === "analyst" ? "text-blue-400" : "text-slate-400"}`}
                />
              </div>
              <div className="flex flex-col text-left pr-4">
                <span
                  className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "analyst" ? "text-blue-400" : "text-slate-300"}`}
                >
                  Tactical Analyst
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Deep tactical insights, formation shifts, and metrics.
                </span>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className={`${BASE_CARD_CLASSES} border-red-500/40 mt-2 sm:mt-6`}>
          <CardContent className="p-4 sm:p-5">
            <Button
              variant="destructive"
              onClick={() => setActiveModal("delete_account")}
              className="w-full h-auto py-4 px-4 sm:px-5 justify-between bg-red-950/20 hover:bg-red-900/40 border-2 border-red-900/60 group rounded-xl"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Trash2 className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-sm sm:text-base font-bold text-red-400">
                    Delete Account
                  </span>
                  <span className="text-xs sm:text-sm text-red-500/70 font-normal mt-0.5">
                    Permanently remove your data
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-500/50 group-hover:text-red-400 shrink-0" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xl font-black text-white uppercase tracking-wide">
                {activeModal === "username" && "Change Username"}
                {activeModal === "email" && "Change Email"}
                {activeModal === "password" && "Change Password"}
                {activeModal === "verify_email" && "Verify Email"}
                {activeModal === "forgot_password" && "Reset Password"}
                {activeModal === "delete_account" && "Delete Account"}
                {activeModal === "language" && "Change Language"}
                {activeModal === "favorites" && "Favorite Team & Player"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium border ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                    : "bg-red-500/10 text-red-400 border-red-500/40"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {activeModal === "language" && (
              <form
                onSubmit={handleSaveLanguage}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map(
                    (code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSelectedLanguage(code)}
                        className={`p-3.5 rounded-xl border-2 text-left font-bold transition-all ${
                          selectedLanguage === code
                            ? "bg-blue-950/50 border-blue-500 text-blue-400"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {LANGUAGE_LABELS[code]}
                      </button>
                    ),
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? "Saving..." : "Save Language"}
                </Button>
              </form>
            )}

            {activeModal === "favorites" && (
              <form
                onSubmit={handleSaveFavorites}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Favorite Team
                  </span>
                  <select
                    value={favoriteTeamInput}
                    onChange={(e) => {
                      setFavoriteTeamInput(e.target.value);
                      setFavoritePlayerInput("");
                    }}
                    className="h-12 px-3 rounded-lg bg-slate-950 text-white border border-slate-700 text-sm"
                  >
                    <option value="">None</option>
                    {teamsList.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.formation})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Favorite Player
                  </span>
                  <select
                    value={favoritePlayerInput}
                    onChange={(e) => setFavoritePlayerInput(e.target.value)}
                    disabled={!selectedClubObj}
                    className="h-12 px-3 rounded-lg bg-slate-950 text-white border border-slate-700 text-sm disabled:opacity-50"
                  >
                    <option value="">
                      {selectedClubObj
                        ? "None (All Players)"
                        : "Select a team first"}
                    </option>
                    {selectedClubObj && (
                      <>
                        <optgroup label="Starters">
                          {selectedClubObj.roster.starters.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.role})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Substitutes">
                          {selectedClubObj.roster.substitutes.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.role})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Reserves">
                          {selectedClubObj.roster.reserves.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} ({p.role})
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? "Saving..." : "Save Favorites"}
                </Button>
              </form>
            )}

            {activeModal === "username" && (
              <form
                onSubmit={handleUpdateUsername}
                className="flex flex-col gap-4"
              >
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="New username (3-64 chars)"
                  className="h-12 bg-slate-950 text-white border-slate-700"
                  required
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? "Updating..." : "Save Username"}
                </Button>
              </form>
            )}

            {activeModal === "email" && (
              <form
                onSubmit={handleUpdateEmail}
                className="flex flex-col gap-4"
              >
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  className="h-12 bg-slate-950 text-white border-slate-700"
                  required
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? "Updating..." : "Save Email"}
                </Button>
              </form>
            )}

            {activeModal === "password" && (
              <form
                onSubmit={handleUpdatePassword}
                className="flex flex-col gap-4"
              >
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Current password"
                  className="h-12 bg-slate-950 text-white border-slate-700"
                  required
                />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (8+ chars, 1 A-Z, 1 !@#$%^&*)"
                  className="h-12 bg-slate-950 text-white border-slate-700"
                  required
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}

            {activeModal === "verify_email" && (
              <form
                onSubmit={
                  otpSent ? handleConfirmVerifyOtp : handleRequestVerifyOtp
                }
                className="flex flex-col gap-4"
              >
                {!otpSent ? (
                  <>
                    <Input
                      type="email"
                      value={verifyEmailInput}
                      onChange={(e) => setVerifyEmailInput(e.target.value)}
                      placeholder="Confirm your current email"
                      className="h-12 bg-slate-950 text-white border-slate-700"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={busy}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 font-bold"
                    >
                      {busy ? "Sending OTP..." : "Send Verification Code"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="h-12 bg-slate-950 text-white border-slate-700"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={busy}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 font-bold"
                    >
                      {busy ? "Verifying..." : "Confirm OTP"}
                    </Button>
                  </>
                )}
              </form>
            )}

            {activeModal === "forgot_password" && (
              <form
                onSubmit={
                  !otpSent
                    ? handleRequestForgotOtp
                    : !otpVerified
                      ? handleVerifyForgotOtp
                      : handleConfirmForgotReset
                }
                className="flex flex-col gap-4"
              >
                {!otpSent ? (
                  <>
                    <Input
                      type="email"
                      value={verifyEmailInput}
                      onChange={(e) => setVerifyEmailInput(e.target.value)}
                      placeholder="Enter your account email"
                      className="h-12 bg-slate-950 text-white border-slate-700"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={busy}
                      className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                    >
                      {busy ? "Sending..." : "Send Reset OTP"}
                    </Button>
                  </>
                ) : !otpVerified ? (
                  <>
                    <Input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="h-12 bg-slate-950 text-white border-slate-700"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={busy}
                      className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                    >
                      {busy ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (8+ chars, 1 A-Z, 1 !@#$%^&*)"
                      className="h-12 bg-slate-950 text-white border-slate-700"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={busy}
                      className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                    >
                      {busy ? "Resetting..." : "Confirm New Password"}
                    </Button>
                  </>
                )}
              </form>
            )}

            {activeModal === "delete_account" && (
              <div className="flex flex-col gap-4">
                <p className="text-slate-300 text-sm">
                  Are you sure you want to permanently delete your account? This
                  action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={busy}
                    className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white font-bold"
                  >
                    {busy ? "Deleting..." : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingAction({
  icon,
  title,
  subtitle,
  status = "default",
  onClick,
}: {
  icon: React.ReactElement<{ className?: string }>;
  title: string;
  subtitle?: string;
  status?: "default" | "warning" | "verified";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-800/40 hover:bg-slate-700/60 border-2 border-slate-700 hover:border-slate-600 rounded-2xl transition-all duration-200 group"
    >
      <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
        <div
          className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${
            status === "warning"
              ? "bg-orange-500/10 text-orange-400"
              : status === "verified"
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
          }`}
        >
          {React.cloneElement(icon, { className: "w-5 h-5 sm:w-6 sm:h-6" })}
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="text-sm sm:text-base font-bold text-slate-200 truncate">
            {title}
          </span>
          {subtitle && (
            <span
              className={`text-xs sm:text-sm font-medium mt-0.5 sm:mt-1 truncate ${
                status === "warning"
                  ? "text-orange-400/80"
                  : status === "verified"
                    ? "text-emerald-400"
                    : "text-slate-500"
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 ml-2" />
    </button>
  );
}
