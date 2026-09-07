// lib/upload.ts
import { createClient } from "@/lib/supabase/client";

export async function uploadProofPhoto(file: File, userId: string, pillar: "gym" | "meal" | "grind"): Promise<string | null> {
  const supabase = createClient();
  
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${pillar}_${Date.now()}.${fileExt}`;

  // 1. Upload file to Supabase Storage 'proofs' bucket
  const { error: uploadError } = await supabase.storage
    .from("proofs")
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError.message);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // 2. Retrieve Public URL
  const { data: { publicUrl } } = supabase.storage
    .from("proofs")
    .getPublicUrl(fileName);

  return publicUrl;
}
