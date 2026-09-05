import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_MB = 0.3; // 300KB hard ceiling per Anti-Cheat spec

/**
 * Compresses a photo captured via the live camera input down to <300KB,
 * then uploads it to the "daily-proofs" bucket under
 * {user_id}/{log_date}/{slot}.jpg — the path the storage RLS policy
 * requires to accept the write.
 */
export async function uploadProof(params: {
  file: File;
  userId: string;
  logDate: string;
  slot: string;
}): Promise<string> {
  const { file, userId, logDate, slot } = params;

  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.8,
  });

  if (compressed.size > MAX_SIZE_MB * 1024 * 1024) {
    // extremely rare — compression couldn't hit target even at low quality
    throw new Error("Photo is too large to upload even after compression. Try a lower-res shot.");
  }

  const supabase = createClient();
  const path = `${userId}/${logDate}/${slot}.jpg`;

  const { error } = await supabase.storage
    .from("daily-proofs")
    .upload(path, compressed, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "3600",
    });

  if (error) throw error;

  const { data } = supabase.storage.from("daily-proofs").getPublicUrl(path);
  return data.publicUrl;
}
