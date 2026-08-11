import { AuthCardView } from "./auth-card-view";
import { ForgotPasswordForm } from "@/forms/auth/forgot-password-form";
export function ForgotPasswordView() { return <AuthCardView title="Reset your password" description="Enter your email and we will send reset instructions."><ForgotPasswordForm /></AuthCardView>; }
