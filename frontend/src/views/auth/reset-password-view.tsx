import { AuthCardView } from "./auth-card-view";
import { ResetPasswordForm } from "@/forms/auth/reset-password-form";
export function ResetPasswordView() { return <AuthCardView title="Choose a new password" description="Use at least eight characters."><ResetPasswordForm /></AuthCardView>; }
