import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { PageHeader } from "@/components/common/page-header";
export function SettingsView() { return <div className="grid gap-8"><PageHeader title="Settings" description="Generic interface preferences only." /><Card className="max-w-xl"><CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Switch between the neutral light and dark themes.</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><span className="text-sm">Color theme</span><ThemeToggle /></CardContent></Card></div>; }
