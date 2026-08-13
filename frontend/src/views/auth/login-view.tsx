import { AuthCardView } from "./auth-card-view";
import { LoginForm } from "@/forms/auth/login-form";

export function LoginView() {
  return (
    <AuthCardView
      title="Admin Login"
      description="Enter your credentials to access your account."
    >
      <LoginForm />
    </AuthCardView>
  );
}
