import type { NeedCategory } from "@/data/needs";

export const CATEGORY_ACCENT: Record<NeedCategory, string> = {
  Love: "#fb7185",
  Connection: "#a78bfa",
  Security: "#38bdf8",
  Respect: "#fbbf24",
  Communication: "#2dd4bf",
  Intimacy: "#e879f9",
  Autonomy: "#34d399",
  Partnership: "#818cf8",
  Togetherness: "#fb923c",
  Future: "#22d3ee",
};

export const CATEGORY_GRADIENT: Record<NeedCategory, string> = {
  Love: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
  Connection: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
  Security: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
  Respect: "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
  Communication: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
  Intimacy: "linear-gradient(135deg, #e879f9 0%, #a21caf 100%)",
  Autonomy: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
  Partnership: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
  Togetherness: "linear-gradient(135deg, #fb923c 0%, #c2410c 100%)",
  Future: "linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)",
};

export const HERO_GRADIENT =
  "linear-gradient(135deg, #fb7185 0%, #fb923c 55%, #fbbf24 100%)";
