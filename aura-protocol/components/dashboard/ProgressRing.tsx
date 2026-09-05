"use client";

import { motion } from "framer-motion";

interface RingProps {
  radius: number;
  stroke: number;
  progress: number; // 0-1
  color: string;
  trackColor?: string;
}

function Ring({ radius, stroke, progress, color, trackColor = "#2C2C2E" }: RingProps) {
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - Math.min(Math.max(progress, 0), 1) * circumference;

  return (
    <g>
      <circle
        stroke={trackColor}
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <motion.circle
        stroke={color}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        transform={`rotate(-90 ${radius} ${radius})`}
      />
    </g>
  );
}

export default function ProgressRings({
  mealsProgress,
  movementDone,
  grindDone,
  isPerfectDay,
  size = 176,
}: {
  mealsProgress: number; // 0-1 (mealsDone / 5)
  movementDone: boolean;
  grindDone: boolean;
  isPerfectDay: boolean;
  size?: number;
}) {
  const stroke = 12;
  const gap = 4;
  const rMeals = size / 2;
  const rMovement = rMeals - stroke - gap;
  const rGrind = rMovement - stroke - gap;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <g transform={`translate(${(size - rMeals * 2) / 2}, ${(size - rMeals * 2) / 2})`}>
          <Ring radius={rMeals} stroke={stroke} progress={mealsProgress} color="#34C759" />
        </g>
        <g
          transform={`translate(${(size - rMovement * 2) / 2}, ${(size - rMovement * 2) / 2})`}
        >
          <Ring
            radius={rMovement}
            stroke={stroke}
            progress={movementDone ? 1 : 0}
            color="#7DD3FC"
          />
        </g>
        <g transform={`translate(${(size - rGrind * 2) / 2}, ${(size - rGrind * 2) / 2})`}>
          <Ring radius={rGrind} stroke={stroke} progress={grindDone ? 1 : 0} color="#F5C244" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isPerfectDay ? (
          <>
            <span className="text-mint text-xs font-semibold tracking-wide">SURGE</span>
            <span className="text-2xl font-bold">1.5×</span>
          </>
        ) : (
          <span className="text-grey-text text-xs tracking-wide">GAUNTLET</span>
        )}
      </div>
    </div>
  );
}
