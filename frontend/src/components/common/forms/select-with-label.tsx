import type { ReactNode } from "react";
import { FormFieldWrapper } from "./form-field-wrapper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SelectFieldOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type Props = {
  id: string;
  label?: string;
  ariaLabel?: string;
  options: readonly SelectFieldOption[];
  value?: string | null;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  onValueChange: (value: string | null) => void;
};

export function SelectWithLabel({
  id,
  label,
  ariaLabel,
  options,
  value,
  placeholder = "Select an option",
  description,
  error,
  required,
  disabled,
  name,
  className,
  triggerClassName,
  contentClassName,
  onValueChange,
}: Props) {
  const selected = options.find((option) => option.value === value);

  return (
    <FormFieldWrapper id={id} label={label} description={description} error={error} required={required} className={className}>
      <Select value={value ?? null} disabled={disabled} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          aria-label={!label ? ariaLabel ?? placeholder : undefined}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={[description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
          className={`h-10 w-full${triggerClassName ? ` ${triggerClassName}` : ""}`}
        >
          <SelectValue placeholder={placeholder}>{selected?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {options.map((option) => <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
    </FormFieldWrapper>
  );
}
