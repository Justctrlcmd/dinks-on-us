"use client";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthCardView } from "./auth-card-view";
import { useResendVerification } from "@/hooks/mutations/use-auth-mutations";
export function VerifyEmailView() { const params = useSearchParams(); const mutation = useResendVerification(); const verified = params.get("verified") === "1"; return <AuthCardView title={verified ? "Email verified" : "Check your email"} description={verified ? "Your account email is now verified." : "Use the secure link we sent to verify your email address."}><div className="grid gap-4">{mutation.data && <Alert><AlertDescription>{mutation.data.message}</AlertDescription></Alert>}<Button variant="outline" disabled={mutation.isPending || verified} onClick={() => mutation.mutate()}>{mutation.isPending ? "Sending..." : "Resend verification email"}</Button></div></AuthCardView>; }
