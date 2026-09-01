import Link from "next/link";
import { NEEDS } from "@/data/needs";
import { NeedCard } from "@/components/NeedCard";
import { CATEGORY_GRADIENT, HERO_GRADIENT } from "@/lib/theme";

const needsById = new Map(NEEDS.map((n) => [n.id, n]));
const affection = needsById.get("affection")!;
const autonomy = needsById.get("autonomy")!;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center gap-6 px-4 pb-10 pt-6 text-center">
      <p
        className="bg-clip-text text-sm font-semibold uppercase tracking-widest text-transparent"
        style={{ backgroundImage: HERO_GRADIENT }}
      >
        My Relationship Needs
      </p>

      <h1 className="font-serif text-3xl leading-tight text-stone-800">
        Discover, understand, and explain your needs
      </h1>

      <div className="grid w-full grid-cols-2 gap-2">
        <NeedCard need={affection} />
        <NeedCard need={autonomy} />
      </div>

      <p className="text-base leading-relaxed text-stone-600">
        You&apos;ll be shown two relationship needs at a time and asked a
        simple question: if you could have more of only one, which would you
        choose?
      </p>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/assessment"
          className="inline-flex w-full items-center justify-center rounded-full px-8 py-4 text-base font-medium text-white shadow-md transition-transform active:scale-[0.98]"
          style={{ background: HERO_GRADIENT }}
        >
          Start the assessment
        </Link>

        <Link
          href="/why"
          className="inline-flex w-full items-center justify-center rounded-full px-8 py-4 text-base font-medium text-white shadow-md transition-transform active:scale-[0.98]"
          style={{ background: CATEGORY_GRADIENT.Connection }}
        >
          Why the needs assessment exists
        </Link>
      </div>
    </main>
  );
}
