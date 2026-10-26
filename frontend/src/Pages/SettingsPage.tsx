import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Mic,
  Activity,
  User,
  ShieldCheck,
  Key,
  Trash2,
  Mail,
  Camera,
  ChevronRight,
  ArrowLeft,
  BookOpen,
  Heart,
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
import { useTranslation } from "../Utils/i18n";
import type { PersonaCode } from "../types";

type ModalType =
  | null
  | "username"
  | "email"
  | "password"
  | "verify_email"
  | "delete_account";

const BASE_CARD_CLASSES =
  "bg-slate-900 border-2 border-slate-700 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] rounded-2xl";
const SECURITY_GROUP_CLASSES =
  "flex flex-col gap-4 p-4 sm:p-5 bg-slate-950/50 border-2 border-slate-800 rounded-2xl";

export function SettingsPage() {
  const { user, logout, patchUser } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = (location.state as { returnTo?: unknown } | null)?.returnTo;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [role, setRole] = useState<PersonaCode>(
    (user?.preferences?.persona as PersonaCode) || "casual",
  );
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [verifiedJustNow, setVerifiedJustNow] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isEmailVerified = Boolean(user?.email_verified) || verifiedJustNow;
  const handleGoBack = () => {
    if (
      typeof returnTo === "string" &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//")
    ) {
      navigate(returnTo);
      return;
    }
    navigate("/home");
  };

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
      patchUser(
        { preferences: res.data.user?.preferences ?? res.data.preferences },
        true,
      );
    } catch (err) {
      setRole(previous);
      setToastMessage(extractError(err));
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

  // 5. DELETE /api/account/delete-account
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:py-14 lg:px-8 flex flex-col gap-8 sm:gap-10">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </button>

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
          {t("settingsTitle")}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base font-medium mt-1">
          {t("settingsSub")}
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">
              {t("profileIdentity")}
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
                {avatarUploading ? t("uploading") : t("editAvatar")}
              </Badge>
            </button>

            <SettingAction
              icon={<User />}
              title={t("changeUsername")}
              subtitle={`${t("currently")}: ${user?.username ?? "..."}`}
              onClick={() => setActiveModal("username")}
            />
          </CardContent>
        </Card>

        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">
              {t("accountSecurity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className={SECURITY_GROUP_CLASSES}>
              <SettingAction
                icon={<Mail />}
                title={t("changeEmail")}
                subtitle={
                  user?.email
                    ? `${t("currently")}: ${user.email}`
                    : t("updateContactAddress")
                }
                onClick={() => setActiveModal("email")}
              />
              <SettingAction
                icon={<ShieldCheck />}
                title={t("verifyEmail")}
                subtitle={
                  isEmailVerified ? t("statusVerified") : t("statusUnverified")
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
                title={t("changePassword")}
                subtitle={t("updateCredentials")}
                onClick={() => setActiveModal("password")}
              />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`${BASE_CARD_CLASSES} border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.08)]`}
        >
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-emerald-500 uppercase tracking-widest">
              {t("broadcastPersona")}
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm sm:text-base mt-1">
              {t("broadcastPersonaSub")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Casual Fan */}
            <button
              type="button"
              onClick={() => handlePersonaChange("casual")}
              className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === "casual"
                  ? "bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div
                className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "casual" ? "bg-emerald-500/20" : "bg-slate-700"}`}
              >
                <Mic className={`w-5 h-5 sm:w-6 sm:h-6 ${role === "casual" ? "text-emerald-400" : "text-slate-400"}`} />
              </div>
              <div className="flex flex-col text-left pr-2">
                <span
                  className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "casual" ? "text-emerald-400" : "text-slate-300"}`}
                >
                  {t("casualFan")}
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-snug">
                  {t("casualFanDesc")}
                </span>
              </div>
            </button>

            {/* Tactical Analyst */}
            <button
              type="button"
              onClick={() => handlePersonaChange("analyst")}
              className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === "analyst"
                  ? "bg-blue-950/40 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div
                className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "analyst" ? "bg-blue-500/20" : "bg-slate-700"}`}
              >
                <Activity className={`w-5 h-5 sm:w-6 sm:h-6 ${role === "analyst" ? "text-blue-400" : "text-slate-400"}`} />
              </div>
              <div className="flex flex-col text-left pr-2">
                <span
                  className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "analyst" ? "text-blue-400" : "text-slate-300"}`}
                >
                  {t("tacticalAnalystPersona")}
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-snug">
                  {t("tacticalAnalystDesc")}
                </span>
              </div>
            </button>

            {/* Newcomer (NEW) */}
            <button
              type="button"
              onClick={() => handlePersonaChange("newcomer")}
              className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === "newcomer"
                  ? "bg-amber-950/40 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div
                className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "newcomer" ? "bg-amber-500/20" : "bg-slate-700"}`}
              >
                <BookOpen className={`w-5 h-5 sm:w-6 sm:h-6 ${role === "newcomer" ? "text-amber-400" : "text-slate-400"}`} />
              </div>
              <div className="flex flex-col text-left pr-2">
                <span
                  className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "newcomer" ? "text-amber-400" : "text-slate-300"}`}
                >
                  {t("newcomerPersona")}
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-snug">
                  {t("newcomerDesc")}
                </span>
              </div>
            </button>

            {/* Die-Hard Club Fan (NEW) */}
            <button
              type="button"
              onClick={() => handlePersonaChange("club_fan")}
              className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                role === "club_fan"
                  ? "bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div
                className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "club_fan" ? "bg-rose-500/20" : "bg-slate-700"}`}
              >
                <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${role === "club_fan" ? "text-rose-400" : "text-slate-400"}`} />
              </div>
              <div className="flex flex-col text-left pr-2">
                <span
                  className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "club_fan" ? "text-rose-400" : "text-slate-300"}`}
                >
                  {t("clubFanPersona")}
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-snug">
                  {t("clubFanDesc")}
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
                    {t("deleteAccount")}
                  </span>
                  <span className="text-xs sm:text-sm text-red-500/70 font-normal mt-0.5">
                    {t("deleteAccountDesc")}
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
                {activeModal === "username" && t("changeUsername")}
                {activeModal === "email" && t("changeEmail")}
                {activeModal === "password" && t("changePassword")}
                {activeModal === "verify_email" && t("verifyEmail")}
                {activeModal === "delete_account" && t("deleteAccount")}
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

            {activeModal === "username" && (
              <form
                onSubmit={handleUpdateUsername}
                className="flex flex-col gap-4"
              >
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={`${t("changeUsername")}...`}
                  className="h-12 bg-slate-950 text-white border-slate-700"
                  required
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? t("saving") : t("saveUsername")}
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
                  placeholder={`${t("changeEmail")}...`}
                  className="h-12 bg-slate-950 text-white border-slate-700"
                  required
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? t("saving") : t("saveEmail")}
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
                  placeholder="New password"
                  className="h-12 bg-slate-950 text-white border-slate-700"
                  required
                />
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-12 font-bold"
                >
                  {busy ? t("saving") : t("updatePasswordBtn")}
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
                      {busy ? t("saving") : t("sendVerificationCode")}
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
                      {busy ? t("saving") : t("confirmOtp")}
                    </Button>
                  </>
                )}
              </form>
            )}

            {activeModal === "delete_account" && (
              <div className="flex flex-col gap-4">
                <p className="text-slate-300 text-sm">
                  {t("deleteAccountDesc")}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1 h-12"
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={busy}
                    className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white font-bold"
                  >
                    {busy ? t("saving") : t("confirmDelete")}
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