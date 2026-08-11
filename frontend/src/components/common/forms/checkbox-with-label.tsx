"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props { id: string; label: string; checked?: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean }
export function CheckboxWithLabel({ id, label, ...props }: Props) {
  return <div className="flex items-center gap-2"><Checkbox id={id} {...props} /><Label htmlFor={id} className="font-normal">{label}</Label></div>;
}
