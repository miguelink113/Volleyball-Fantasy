"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Trend } from "@/lib/types";

export const TrendIcon = ({ trend, size = 14 }: { trend: Trend; size?: number }) => {
  if (trend === "up") return <TrendingUp size={size} className="text-emerald-400" />;
  if (trend === "down") return <TrendingDown size={size} className="text-red-400" />;
  return <Minus size={size} className="text-slate-500" />;
};
