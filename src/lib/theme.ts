import type { NeedCategory } from "@/data/needs";

export const CATEGORY_ACCENT: Record<NeedCategory, string> = {
  "Love & Affection": "#fb7185",
  "Intimacy & Desire": "#e879f9",
  "Security & Trust": "#38bdf8",
  "Communication & Understanding": "#2dd4bf",
  "Respect & Appreciation": "#fbbf24",
  "Connection & Togetherness": "#a78bfa",
  "Autonomy & Boundaries": "#22d3ee",
  "Growth & Exploration": "#34d399",
  "Partnership & Shared Life": "#818cf8",
};

export const CATEGORY_GRADIENT: Record<NeedCategory, string> = {
  "Love & Affection": "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
  "Intimacy & Desire": "linear-gradient(135deg, #e879f9 0%, #a21caf 100%)",
  "Security & Trust": "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
  "Communication & Understanding": "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
  "Respect & Appreciation": "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
  "Connection & Togetherness": "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
  "Autonomy & Boundaries": "linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)",
  "Growth & Exploration": "linear-gradient(135deg, #34d399 0%, #059669 100%)",
  "Partnership & Shared Life": "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
};

export const HERO_GRADIENT =
  "linear-gradient(135deg, #fb7185 0%, #fb923c 55%, #fbbf24 100%)";
