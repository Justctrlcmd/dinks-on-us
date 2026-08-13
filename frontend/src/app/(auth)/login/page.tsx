import type { Metadata } from "next";
import { LoginView } from "@/views/auth/login-view";

export const metadata: Metadata = {
  title: "Admin Login",
};

export default function Page() { return <LoginView />; }
