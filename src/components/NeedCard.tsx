import {
  CATEGORY_EMOJI,
  CATEGORY_SHORT_LABEL,
  type RelationshipNeed,
} from "@/data/needs";
import { CATEGORY_GRADIENT } from "@/lib/theme";

export function NeedCard({
  need,
  onClick,
}: {
  need: RelationshipNeed;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className="flex h-full flex-col items-start gap-2.5 rounded-2xl p-4 text-left text-white shadow-sm transition-transform active:scale-[0.98]"
      style={{ background: CATEGORY_GRADIENT[need.category] }}
    >
      <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide">
        {CATEGORY_EMOJI[need.category]} {CATEGORY_SHORT_LABEL[need.category]}
      </span>
      <span className="font-serif text-xl font-semibold leading-tight">
        {need.name}
      </span>
      <span className="text-[13px] leading-relaxed text-white/90">
        {need.description}
      </span>
      <div className="mt-auto flex flex-wrap gap-1 pt-1">
        {need.subNeeds.map((sub) => (
          <span
            key={sub}
            className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] leading-none text-white/85"
          >
            {sub}
          </span>
        ))}
      </div>
    </Tag>
  );
}
