// components/dashboard/ProofModal.tsx
"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Camera, 
  X, 
  UploadCloud, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  RotateCcw,
  Sparkles
} from "lucide-react";
import Image from "next/image";

interface ProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  pillarType: "gym" | "deep_work" | "meal";
  pillarLabel: string;
  mealIndex?: number;
  onSuccess: () => void;
}

// Deterministic daily anti-cheat gesture
function getDailyGesture(): string {
  const gestures = [
    "✌️ Two Fingers (Peace Sign)",
    "👍 Thumbs Up next to your workspace / equipment",
    "👌 OK Sign clearly visible",
    "🖐️ Open Palm facing the lens",
    "🤙 Shaka Sign in the frame",
    "☝️ Index Finger pointing up",
  ];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return gestures[dayOfYear % gestures.length];
}

export default function ProofModal({
  isOpen,
  onClose,
  pillarType,
  pillarLabel,
  mealIndex,
  onSuccess,
}: ProofModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = createClient();
  const dailyGesture = getDailyGesture();

  if (!isOpen) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  function handleReset() {
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUploadProof() {
    if (!file) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Session expired. Please log in again.");
      setUploading(false);
      return;
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const fileExt = file.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/${todayDate}_${pillarType}_${mealIndex ?? "0"}_${Date.now()}.${fileExt}`;

    // 1. Upload raw image file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("proofs")
      .upload(filePath, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      alert(`Storage upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    // 2. Obtain permanent public URL
    const { data: publicUrlData } = supabase.storage
      .from("proofs")
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    // 3. Find or initialize today's daily_log
    let { data: dailyLog } = await supabase
      .from("daily_logs")
      .select("id, gym_done, editing_done, meals_logged")
      .eq("user_id", user.id)
      .eq("log_date", todayDate)
      .maybeSingle();

    if (!dailyLog) {
      const { data: createdLog } = await supabase
        .from("daily_logs")
        .insert({
          user_id: user.id,
          log_date: todayDate,
          gym_done: pillarType === "gym",
          editing_done: pillarType === "deep_work",
          meals_logged: pillarType === "meal" ? 1 : 0,
        })
        .select()
        .single();
      dailyLog = createdLog;
    } else {
      const updatePayload: Record<string, any> = {};
      if (pillarType === "gym") updatePayload.gym_done = true;
      if (pillarType === "deep_work") updatePayload.editing_done = true;
      if (pillarType === "meal") updatePayload.meals_logged = Math.min(5, (dailyLog.meals_logged || 0) + 1);

      await supabase
        .from("daily_logs")
        .update(updatePayload)
        .eq("id", dailyLog.id);
    }

    // 4. Insert proof record into posts feed
    await supabase.from("posts").insert({
      user_id: user.id,
      daily_log_id: dailyLog?.id || null,
      activity: pillarType,
      image_url: imageUrl,
      caption: caption.trim() || `Verified ${pillarLabel} submission.`,
    });

    // 5. Award 10 AP dividend for verified pillar submission
    const { data: profile } = await supabase
      .from("profiles")
      .select("aura_points")
      .eq("id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ aura_points: (profile.aura_points || 0) + 10 })
        .eq("id", user.id);
    }

    setUploading(false);
    handleReset();
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="liquid-glass rounded-3xl p-6 max-w-sm w-full border border-white/80 bg-white/95 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-zinc-900">{pillarLabel}</h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Live Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Anti-Cheat Daily Gesture Rule */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Today&apos;s Gesture Requirement</span>
          </div>
          <p className="text-xs font-bold text-amber-950">
            {dailyGesture}
          </p>
          <p className="text-[10px] text-amber-800/80 font-medium">
            Must be visible alongside your proof to protect against false flags.
          </p>
        </div>

        {/* Capture or Upload Area */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-zinc-200 hover:border-emerald-500/50 bg-zinc-50 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-zinc-200 flex items-center justify-center text-zinc-500 group-hover:text-emerald-600 group-hover:scale-105 transition-all">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-zinc-800">Capture Live Proof</p>
                <p className="text-[10px] text-zinc-400 font-medium">Camera or verified photo</p>
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 shadow-inner bg-zinc-100">
                <Image
                  src={previewUrl}
                  alt="Proof preview"
                  fill
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-800 font-bold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>
            </div>
          )}

          {/* Optional Caption */}
          <input
            type="text"
            placeholder="Add verification notes (optional)..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full p-3 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleUploadProof}
          disabled={uploading || !file}
          className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Telemetry...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Submit Proof (+10 AP)</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
}
