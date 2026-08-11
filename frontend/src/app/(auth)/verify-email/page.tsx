import { Suspense } from "react";
import { LoadingState } from "@/components/common/loading-state";
import { VerifyEmailView } from "@/views/auth/verify-email-view";
export default function Page() { return <Suspense fallback={<LoadingState fullPage message="Checking verification status..." />}><VerifyEmailView /></Suspense>; }
