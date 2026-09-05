import clsx from "clsx";
import type { RankTitle } from "@/types/database";

const RANK_STYLES: Record<RankTitle, string> = {
  "👑 FINAL BOSS": "text-gold shadow-glow-gold border-gold/30",
  "🥶 OG": "text-ice border-ice/30",
  "💀 IM TRYING BLUD": "text-bronze border-bronze/30",
  "👶 TRY HARD KIDS": "text-grey-flat border-border",
};

export default function RankBadge({
  rankTitle,
  size = "default",
}: {
  rankTitle: RankTitle | string;
  size?: "sm" | "default";
}) {
  const style = RANK_STYLES[rankTitle as RankTitle] ?? RANK_STYLES["👶 TRY HARD KIDS"];

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-pill border font-medium tracking-wide",
        style,
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      )}
    >
      {rankTitle}
    </span>
  );
}
