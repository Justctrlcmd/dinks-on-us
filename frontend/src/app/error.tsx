"use client";
import { ErrorState } from "@/components/common/error-state";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="grid min-h-svh place-items-center p-6"><ErrorState title="Something went wrong." description="The page could not be displayed safely." onRetry={reset} /></main>; }
