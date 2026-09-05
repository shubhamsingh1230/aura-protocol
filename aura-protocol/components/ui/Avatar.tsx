import clsx from "clsx";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic gradient per name so the same person always gets the same
// ring color across the feed and leaderboard, without storing anything.
const GRADIENTS = [
  "from-mint to-ice",
  "from-gold to-crimson",
  "from-ice to-mint",
  "from-crimson to-gold",
  "from-bronze to-gold",
];

function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export default function Avatar({
  name,
  live,
  size = "md",
}: {
  name: string;
  live?: boolean;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "w-8 h-8 text-[11px]" : "w-11 h-11 text-sm";

  return (
    <div className="relative shrink-0">
      <div
        className={clsx(
          "rounded-full p-[2px] bg-gradient-to-br",
          gradientFor(name),
          dims
        )}
      >
        <div className="w-full h-full rounded-full bg-card flex items-center justify-center font-semibold">
          {initialsFrom(name)}
        </div>
      </div>
      {live && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-mint border-2 border-black animate-pulse-ring" />
      )}
    </div>
  );
}
