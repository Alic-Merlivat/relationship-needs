"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  clearAssessmentState,
  clearPartnerRanks,
  clearResults,
  clearSelection,
} from "@/lib/storage";

/**
 * Legacy entry point.
 *
 * Invitations sent before server persistence packed the sender's complete
 * ranking into this URL. Those links may still be sitting in inboxes, so
 * the route stays alive rather than 404ing — but the ranking it carries is
 * over all 46 needs, which can no longer be compared against a self-chosen
 * top ten. The payload is therefore dropped and the person simply starts
 * the current flow.
 */
export default function ComparePage() {
  const router = useRouter();

  useEffect(() => {
    clearPartnerRanks();
    clearResults();
    clearAssessmentState();
    clearSelection();
    router.replace("/select");
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <p className="text-stone-400">Setting up your assessment...</p>
    </main>
  );
}
