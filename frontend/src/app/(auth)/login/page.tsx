import type { Metadata } from "next";
import { LoginView } from "@/views/auth/login-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin Login",
  ...noIndexMetadata,
};

export default function Page() { return <LoginView />; }
