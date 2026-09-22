import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/common/loading-state";
import { noIndexMetadata } from "@/lib/seo";
import { VerifyEmailView } from "@/views/auth/verify-email-view";
export const metadata: Metadata = noIndexMetadata;
export default function Page() { return <Suspense fallback={<LoadingState fullPage message="Checking verification status..." />}><VerifyEmailView /></Suspense>; }
