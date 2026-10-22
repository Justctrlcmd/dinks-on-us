import type { Metadata } from "next";
import { LoginView } from "@/views/auth/login-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function Page() { return <LoginView />; }
