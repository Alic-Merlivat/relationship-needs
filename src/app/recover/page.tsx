"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { HERO_GRADIENT } from "@/lib/theme";

/**
 * Recovering a lost or expired results link.
 *
 * The confirmation is deliberately the same whether or not the address is
 * known — whether someone has used a relationship tool isn't something a
 * stranger should be able to probe for.
 */
export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const response = await fetch("/api/access/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-5">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-[11px] font-medium uppercase tracking-widest text-rose-400">
          My Relationship Needs
        </p>
        <h1 className="font-serif text-2xl font-semibold leading-tight text-stone-800">
          Get your link back
        </h1>
      </div>

      {status === "sent" ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="text-sm leading-relaxed text-stone-600">
            If we have results saved for {email}, a fresh link is on its way.
            It works for 30 days.
          </p>
          <Link href="/" className="text-xs font-medium text-rose-400">
            Back to the start
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs leading-relaxed text-stone-500">
            Enter the email you used, and we&apos;ll send a new private link
            to your results.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="rounded-full border border-stone-200 px-3 py-2 text-xs text-stone-700 outline-none focus:border-rose-300"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-full px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
            style={{ background: HERO_GRADIENT }}
          >
            {status === "sending" ? "Sending…" : "Email me a link"}
          </button>
          {status === "error" && error && (
            <p className="text-xs font-medium text-rose-500">{error}</p>
          )}
        </form>
      )}
    </main>
  );
}
