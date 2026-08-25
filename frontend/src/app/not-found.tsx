import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
export default function NotFound() { return <main className="grid min-h-svh place-items-center p-6"><EmptyState title="Page not found" description="The page may have moved or no longer exists." action={<Button nativeButton={false} render={<Link href="/" />}>Return home</Button>} /></main>; }
