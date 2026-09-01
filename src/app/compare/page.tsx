"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearAssessmentState,
  clearResults,
  createAssessmentState,
  decodeShareableRanks,
  saveAssessmentState,
  savePartnerRanks,
} from "@/lib/storage";

function CompareRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("from");
    const decoded = code ? decodeShareableRanks(code) : null;

    if (!decoded) {
      router.replace("/");
      return;
    }

    savePartnerRanks(decoded);
    clearResults();
    clearAssessmentState();
    saveAssessmentState(createAssessmentState());
    router.replace("/assessment");
  }, [router, searchParams]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <p className="text-stone-400">Setting up your comparison...</p>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <p className="text-stone-400">Loading...</p>
        </main>
      }
    >
      <CompareRedirect />
    </Suspense>
  );
}
