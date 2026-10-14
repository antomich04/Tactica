import React, { useState } from "react";
import {
  Mic, Activity, User, ShieldCheck, Key, Trash2,
  Mail, HelpCircle, Globe, Heart, Camera, ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/Components/card";
import { Button } from "@/Components/button";
import { Badge } from "@/Components/badge";
import { useAuth } from "../Providers/AuthProvider";

type Role = "casual" | "analyst";

const BASE_CARD_CLASSES = "bg-slate-900 border-2 border-slate-700 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] rounded-2xl";
const SECURITY_GROUP_CLASSES = "flex flex-col gap-4 p-4 sm:p-5 bg-slate-950/50 border-2 border-slate-800 rounded-2xl";

export function SettingsPage() {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>("casual");

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:py-14 lg:px-8 flex flex-col gap-8 sm:gap-10 transition-all duration-300">
      
      <div className="flex flex-col gap-2 border-b-2 border-slate-800 pb-6 sm:pb-8">
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-wider">Settings</h1>
        <p className="text-slate-400 text-sm sm:text-base font-medium mt-1">
          Manage your identity, security, and broadcast preferences.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        
        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">Profile & Identity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            
            <div className="group flex flex-col items-center mb-6 relative cursor-pointer self-center">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-slate-800 border-[3px] border-slate-600 group-hover:border-emerald-500 rounded-full flex items-center justify-center overflow-hidden relative transition-all duration-200">
                <User className="w-12 h-12 sm:w-14 sm:h-14 text-slate-400 transition-opacity duration-200 group-hover:opacity-0" />
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-400" />
                </div>
              </div>
              <Badge variant="outline" className="absolute -bottom-3 shadow-md border-2 border-slate-700 bg-slate-800 text-slate-300 px-4 py-1 text-xs sm:text-sm whitespace-nowrap">
                Edit Avatar
              </Badge>
            </div>

            <SettingAction
              icon={<User />}
              title="Change Username"
              subtitle={`Currently: ${user?.username ?? "Account"}`}
            />
          </CardContent>
        </Card>

        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">App Preferences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingAction icon={<Globe />} title="Change Language" subtitle="English (US)" />
            <SettingAction icon={<Heart />} title="Favorite Team / Player" subtitle="None selected" />
          </CardContent>
        </Card>

        <Card className={BASE_CARD_CLASSES}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest">Account Security</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            
            <div className={SECURITY_GROUP_CLASSES}>
              <SettingAction icon={<Mail />} title="Change Email" subtitle="Update your contact address" />
              <SettingAction icon={<ShieldCheck />} title="Verify Email" subtitle="Status: Unverified" status="warning" />
            </div>

            <div className={SECURITY_GROUP_CLASSES}>
              <SettingAction icon={<Key />} title="Change Password" subtitle="Update your credentials" />
              <SettingAction icon={<HelpCircle />} title="Forgot Password" subtitle="Send a reset link" />
            </div>

          </CardContent>
        </Card>

        <Card className={`${BASE_CARD_CLASSES} border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.08)]`}>
          <CardHeader className="pb-5">
            <CardTitle className="text-sm font-black text-emerald-500 uppercase tracking-widest">Broadcast Persona</CardTitle>
            <CardDescription className="text-slate-400 text-sm sm:text-base mt-1">
              Select how you want to receive live match updates on the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            
            <button 
              type="button"
              aria-pressed={role === "casual"}
              onClick={() => setRole("casual")}
              className={`relative flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                role === "casual" 
                  ? "bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "casual" ? "bg-emerald-500/20" : "bg-slate-700"}`}>
                <Mic className={`w-6 h-6 ${role === "casual" ? "text-emerald-400" : "text-slate-400"}`} />
              </div>
              <div className="flex flex-col text-left pr-4">
                <span className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "casual" ? "text-emerald-400" : "text-slate-300"}`}>
                  Casual Fan
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Emotion-driven commentary and basic play-by-play.
                </span>
              </div>
              {role === "casual" && (
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button 
              type="button"
              aria-pressed={role === "analyst"}
              onClick={() => setRole("analyst")}
              className={`relative flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                role === "analyst" 
                  ? "bg-blue-950/40 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                  : "bg-slate-800 border-slate-700 hover:border-slate-500"
              }`}
            >
              <div className={`p-3 rounded-xl mt-0.5 shrink-0 ${role === "analyst" ? "bg-blue-500/20" : "bg-slate-700"}`}>
                <Activity className={`w-6 h-6 ${role === "analyst" ? "text-blue-400" : "text-slate-400"}`} />
              </div>
              <div className="flex flex-col text-left pr-4">
                <span className={`text-sm sm:text-base font-black uppercase tracking-wider ${role === "analyst" ? "text-blue-400" : "text-slate-300"}`}>
                  Tactical Analyst
                </span>
                <span className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Deep tactical insights, formation shifts, and metrics.
                </span>
              </div>
              {role === "analyst" && (
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>

          </CardContent>
        </Card>

        <Card className={`${BASE_CARD_CLASSES} border-red-500/40 mt-2 sm:mt-6`}>
          <CardContent className="p-4 sm:p-5">
            <Button 
              variant="destructive" 
              className="w-full h-auto py-4 px-4 sm:px-5 justify-between bg-red-950/20 hover:bg-red-900/40 border-2 border-red-900/60 group rounded-xl"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <Trash2 className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-sm sm:text-base font-bold text-red-400">Delete Account</span>
                  <span className="text-xs sm:text-sm text-red-500/70 font-normal mt-0.5">Permanently remove your data</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-500/50 group-hover:text-red-400 shrink-0" />
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function SettingAction({ 
  icon, 
  title, 
  subtitle, 
  status = "default" 
}: { 
  icon: React.ReactElement<{ className?: string }>;
  title: string; 
  subtitle?: string;
  status?: "default" | "warning";
}) {
  return (
    <button className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-800/40 hover:bg-slate-700/60 border-2 border-slate-700 hover:border-slate-600 rounded-2xl transition-all duration-200 group">
      <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
        <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${
          status === "warning" 
            ? "bg-orange-500/10 text-orange-400" 
            : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
        }`}>
          {React.cloneElement(icon, { className: "w-5 h-5 sm:w-6 sm:h-6" })}
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="text-sm sm:text-base font-bold text-slate-200 truncate">{title}</span>
          {subtitle && (
            <span className={`text-xs sm:text-sm font-medium mt-0.5 sm:mt-1 truncate ${
              status === "warning" ? "text-orange-400/80" : "text-slate-500"
            }`}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 ml-2" />
    </button>
  );
}