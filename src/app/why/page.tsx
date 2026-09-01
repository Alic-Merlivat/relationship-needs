import Link from "next/link";
import type { ReactNode } from "react";
import { CATEGORY_GRADIENT, HERO_GRADIENT } from "@/lib/theme";

const STEP_GRADIENT = {
  1: CATEGORY_GRADIENT.Connection,
  2: CATEGORY_GRADIENT.Security,
  3: CATEGORY_GRADIENT.Respect,
  4: CATEGORY_GRADIENT.Communication,
  5: HERO_GRADIENT,
} as const;

function StepHeader({
  step,
  label,
  question,
}: {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;
  question: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex items-baseline gap-3">
        <span
          className="bg-clip-text font-serif text-4xl font-bold text-transparent"
          style={{ backgroundImage: STEP_GRADIENT[step] }}
        >
          {String(step).padStart(2, "0")}
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
          {label}
        </span>
      </div>
      <h2 className="max-w-sm font-serif text-2xl font-semibold leading-snug text-stone-800">
        {question}
      </h2>
    </div>
  );
}

function Chevron({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex justify-center py-2">
      <span
        className="bg-clip-text text-2xl font-bold text-transparent"
        style={{ backgroundImage: STEP_GRADIENT[step] }}
      >
        ↓
      </span>
    </div>
  );
}

function Translation({ surface, need }: { surface: string; need: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm italic leading-relaxed text-stone-400">
        &ldquo;{surface}&rdquo;
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-stone-300">
        really means
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-stone-800">
        &ldquo;{need}&rdquo;
      </p>
    </div>
  );
}

function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="rounded-2xl border-l-4 border-rose-300 bg-white p-4 text-sm italic leading-relaxed text-stone-600 shadow-sm">
      {children}
    </blockquote>
  );
}

export default function WhyPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pb-20 pt-14">
      <p className="text-center text-sm font-semibold uppercase tracking-widest text-rose-400">
        Why the needs assessment exists
      </p>
      <h1 className="text-center font-serif text-3xl font-semibold leading-tight text-stone-800 sm:text-4xl">
        Understanding your needs can change how you understand your
        relationship
      </h1>
      <p className="mx-auto max-w-md text-center text-base leading-relaxed text-stone-600">
        Two people can genuinely love each other and still experience the
        relationship very differently — because what makes each person feel
        connected, secure, respected, or loved may be different.
      </p>

      <div className="my-6 h-px w-full bg-stone-200" />

      {/* Step 01 — Know yourself */}
      <section className="flex flex-col gap-4">
        <StepHeader step={1} label="Know yourself" question="What do I need?" />
        <p className="leading-relaxed text-stone-600">
          We all have needs in relationships. We may need closeness,
          affection, reassurance, freedom, honesty, sexual intimacy,
          appreciation, stability, adventure, personal space, emotional
          safety — or dozens of other things.
        </p>
        <p className="leading-relaxed text-stone-600">
          But most of us have never stopped to ask:{" "}
          <span className="font-medium text-stone-800">
            what do I actually need to feel good in a relationship?
          </span>{" "}
          And even when we feel that something is missing, it can be
          surprisingly difficult to explain what is missing.
        </p>
        <div className="flex flex-col gap-3">
          <Translation
            surface="You don't care about me."
            need="I need to feel prioritized."
          />
          <Translation
            surface="Why don't you ever talk to me?"
            need="I need emotional closeness and reassurance."
          />
          <Translation
            surface="You're always controlling me."
            need="I need autonomy, trust and personal space."
          />
        </div>
        <p className="leading-relaxed text-stone-600">
          Learning to recognize the need underneath the reaction can
          completely change a conversation.
        </p>
      </section>

      <Chevron step={1} />

      {/* Step 02 — Understand why */}
      <section className="flex flex-col gap-4">
        <StepHeader
          step={2}
          label="Understand why"
          question="Why does this matter so much to me?"
        />
        <p className="leading-relaxed text-stone-600">
          When we don&apos;t understand our needs, we often communicate them
          indirectly. We become frustrated. We criticize. We withdraw. We
          pursue. We expect our partner to somehow know what we need.
          Sometimes we don&apos;t even understand ourselves why a particular
          situation affects us so strongly.
        </p>
        <p className="leading-relaxed text-stone-600">
          Knowing your needs gives you another possibility:{" "}
          <span className="font-medium text-stone-800">
            &ldquo;Something is happening inside me. What am I actually
            needing here?&rdquo;
          </span>{" "}
          Instead of only reacting to the feeling, you can begin putting
          words around it.
        </p>
        <div className="flex flex-col gap-3">
          <Quote>
            &ldquo;Reliability is extremely important to me. When plans
            repeatedly change without communication, I start feeling
            insecure.&rdquo;
          </Quote>
          <Quote>
            &ldquo;Physical affection is one of the ways I experience
            connection. When we go a long time without touching, I start
            feeling distant from you.&rdquo;
          </Quote>
        </div>
        <p className="leading-relaxed text-stone-600">
          Understanding the need doesn&apos;t automatically solve the
          problem. But it gives you something much more useful to
          communicate.
        </p>
      </section>

      <Chevron step={2} />

      {/* Step 03 — Understand your partner */}
      <section className="flex flex-col gap-4">
        <StepHeader
          step={3}
          label="Understand your partner"
          question="What do they need?"
        />
        <p className="leading-relaxed text-stone-600">
          This may be one of the most important things to understand: what
          makes you feel loved isn&apos;t necessarily what makes your partner
          feel loved.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              One person may strongly need
            </p>
            <p className="mt-2 font-serif text-lg font-semibold text-stone-800">
              Closeness · Reassurance · Communication · Affection
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              While their partner places more importance on
            </p>
            <p className="mt-2 font-serif text-lg font-semibold text-stone-800">
              Autonomy · Trust · Independence · Personal Space
            </p>
          </div>
        </div>
        <p className="leading-relaxed text-stone-600">
          Neither person necessarily cares more or less about the
          relationship. They may simply experience security differently. And
          without understanding that difference, both can misinterpret each
          other.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Quote>&ldquo;If you loved me, you&apos;d want to spend more time with me.&rdquo;</Quote>
          <Quote>&ldquo;If you trusted me, you&apos;d let me have more space.&rdquo;</Quote>
        </div>
        <p className="leading-relaxed text-stone-600">
          Both are trying to protect something important. They just
          don&apos;t yet have the language for it.
        </p>
      </section>

      <Chevron step={3} />

      {/* Step 04 — See the difference */}
      <section className="flex flex-col gap-4">
        <StepHeader
          step={4}
          label="See the difference"
          question="Where do our needs align or collide?"
        />
        <p className="leading-relaxed text-stone-600">
          Imagine one partner feels uncertain and needs closeness and
          reassurance. They move toward their partner. But their partner is
          overwhelmed and needs space and autonomy. They move away. The first
          person experiences that distance as even more threatening and
          seeks more connection. The second experiences the increased
          pursuit as pressure and seeks even more space.
        </p>

        <LoopDiagram />

        <p className="leading-relaxed text-stone-600">
          Neither person&apos;s need is necessarily wrong. The interaction
          between those needs is creating the conflict. Recognizing that
          pattern allows the conversation to change from{" "}
          <span className="italic text-stone-800">
            &ldquo;Why are you pushing me away?&rdquo;
          </span>{" "}
          and{" "}
          <span className="italic text-stone-800">
            &ldquo;Why won&apos;t you leave me alone?&rdquo;
          </span>{" "}
          to:
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Quote>&ldquo;When I feel distance between us, I need reassurance.&rdquo;</Quote>
          <Quote>
            &ldquo;When I&apos;m overwhelmed, I need some space — but that
            doesn&apos;t mean I&apos;m leaving the relationship.&rdquo;
          </Quote>
        </div>
        <p className="leading-relaxed text-stone-600">
          That&apos;s a completely different conversation.
        </p>

        <p className="mt-2 leading-relaxed text-stone-600">
          Many arguments aren&apos;t really about the thing we&apos;re
          arguing about. Understanding the underlying needs doesn&apos;t mean
          every need must always be satisfied — it means we can finally
          discuss the real issue. And that makes compromise much more
          possible.
        </p>
        <div className="flex flex-col gap-2">
          <Translation surface="Coming home late" need="Reliability" />
          <Translation surface="Texting habits" need="Reassurance or autonomy" />
          <Translation
            surface="Sex"
            need="Desire, connection, acceptance, safety, or freedom from pressure"
          />
          <Translation
            surface="Spending weekends together"
            need="Quality time for one, independence for the other"
          />
        </div>
      </section>

      <Chevron step={4} />

      {/* Step 05 — Communicate */}
      <section className="flex flex-col gap-4">
        <StepHeader
          step={5}
          label="Communicate"
          question="How can we meet both people's needs?"
        />
        <p className="leading-relaxed text-stone-600">
          This project grew from a simple realization: sometimes we know
          that something doesn&apos;t feel right in a relationship, but we
          don&apos;t have the words to explain what we need. And sometimes we
          assume that the person we love must need the same things we do.
          They may not.
        </p>
        <p className="leading-relaxed text-stone-600">
          The purpose of this assessment isn&apos;t to tell you what a
          relationship should look like. It&apos;s to help you discover:
        </p>
        <ul className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
          {[
            "What matters to me?",
            "Why might it matter so much to me?",
            "What matters to my partner?",
            "Where are we similar?",
            "Where are we different?",
            "And how can we talk about those differences without making either person wrong?",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-stone-700">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-rose-300" />
              {line}
            </li>
          ))}
        </ul>
        <p className="font-serif text-lg font-semibold leading-snug text-stone-800">
          First understand yourself. Then understand each other.
        </p>
        <p className="leading-relaxed text-stone-600">
          Your needs aren&apos;t instructions your partner must obey. And
          differences don&apos;t automatically mean incompatibility. They are
          information. The better you understand what creates connection,
          security, intimacy and freedom for each of you, the easier it
          becomes to communicate clearly — especially when things are
          difficult.
        </p>

        <Link
          href="/assessment"
          className="mt-2 inline-flex w-full items-center justify-center rounded-full px-8 py-4 text-base font-medium text-white shadow-md transition-transform active:scale-[0.98]"
          style={{ background: HERO_GRADIENT }}
        >
          Discover your relationship needs →
        </Link>
      </section>
    </main>
  );
}

function LoopDiagram() {
  const cellClass =
    "rounded-2xl bg-white p-3 text-center text-xs font-medium leading-snug text-stone-700 shadow-sm";
  return (
    <div className="rounded-3xl bg-stone-100 p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className={cellClass}>
          Feels distant
          <br />
          <span className="text-rose-500">needs reassurance</span>
        </div>
        <span className="text-lg text-stone-400">→</span>
        <div className={cellClass}>
          Moves closer
          <br />
          <span className="text-rose-500">pursues</span>
        </div>

        <span className="text-lg text-stone-400">↑</span>
        <span />
        <span className="text-lg text-stone-400">↓</span>

        <div className={cellClass}>
          Partner withdraws
          <br />
          <span className="text-sky-500">creates more distance</span>
        </div>
        <span className="text-lg text-stone-400">←</span>
        <div className={cellClass}>
          Feels pressure
          <br />
          <span className="text-sky-500">needs space</span>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400">
        Neither need is wrong — but without understanding it, the loop keeps
        feeding itself.
      </p>
    </div>
  );
}
