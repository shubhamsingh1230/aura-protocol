/**
 * Run with: npm run seed
 * Populates the next 14 days of "Gesture of the Day" so the check-in
 * screen always has something to show, instead of relying on someone
 * adding rows manually every morning.
 */
import { createClient } from "@supabase/supabase-js";

const GESTURES = [
  { label: "Peace Sign", emoji: "✌️" },
  { label: "Thumbs Up", emoji: "👍" },
  { label: "Finger Guns", emoji: "🤙" },
  { label: "Fist Bump", emoji: "👊" },
  { label: "Wave", emoji: "👋" },
  { label: "OK Sign", emoji: "👌" },
  { label: "Rock On", emoji: "🤟" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const rows = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const gesture = GESTURES[i % GESTURES.length];
    return {
      gesture_date: date.toISOString().slice(0, 10),
      gesture_label: gesture.label,
      gesture_emoji: gesture.emoji,
    };
  });

  const { error } = await supabase.from("daily_gestures").upsert(rows);
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} days of gestures.`);
}

main();
