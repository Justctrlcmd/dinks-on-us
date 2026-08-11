import { Suspense } from "react";
import { LoadingState } from "@/components/common/loading-state";
import { ResetPasswordView } from "@/views/auth/reset-password-view";
export default function Page() { return <Suspense fallback={<LoadingState fullPage message="Preparing password reset..." />}><ResetPasswordView /></Suspense>; }
