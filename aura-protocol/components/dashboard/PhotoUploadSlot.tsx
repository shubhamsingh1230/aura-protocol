"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { uploadProof } from "@/lib/uploadProof";

interface Props {
  slot: string;
  label: string;
  icon: string;
  imageUrl: string | null;
  userId: string;
  logDate: string;
  disabled?: boolean;
  onUploaded: (slot: string, url: string) => void;
}

export default function PhotoUploadSlot({
  slot,
  label,
  icon,
  imageUrl,
  userId,
  logDate,
  disabled,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = Boolean(imageUrl);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadProof({ file, userId, logDate, slot });
      onUploaded(slot, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      disabled={disabled || uploading}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "relative w-full aspect-square rounded-card border flex flex-col items-center justify-center gap-1.5 overflow-hidden transition-all",
        done
          ? "border-mint/40 bg-mint/5 shadow-glow"
          : "border-border bg-card active:bg-card-active",
        disabled && "opacity-40"
      )}
    >
      {/* HTML5 live camera capture — no gallery picker, matches the
          Anti-Cheat requirement in the brief */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {done && imageUrl ? (
        <img src={imageUrl} alt={label} className="absolute inset-0 w-full h-full object-cover" />
      ) : null}

      <div
        className={clsx(
          "relative z-10 flex flex-col items-center gap-1",
          done && "bg-black/50 rounded-xl px-2 py-1.5"
        )}
      >
        {uploading ? (
          <span className="text-xs text-grey-text animate-pulse">Compressing…</span>
        ) : (
          <>
            <span className="text-xl leading-none">{done ? "✓" : icon}</span>
            <span
              className={clsx(
                "text-[11px] font-medium tracking-wide",
                done ? "text-mint" : "text-grey-text"
              )}
            >
              {label}
            </span>
          </>
        )}
      </div>

      {done && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-mint flex items-center justify-center z-20"
        >
          <span className="text-black text-[10px] font-bold">✓</span>
        </motion.div>
      )}

      {error && (
        <p className="absolute bottom-1 left-1 right-1 text-crimson text-[10px] text-center z-10">
          {error}
        </p>
      )}
    </motion.button>
  );
}
