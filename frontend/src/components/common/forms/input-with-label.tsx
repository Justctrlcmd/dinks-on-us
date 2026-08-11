import { Input } from "@/components/ui/input";
import { FormFieldWrapper } from "./form-field-wrapper";

type Props = React.ComponentProps<typeof Input> & { label: string; error?: string; description?: string };

export function InputWithLabel({ label, error, description, required, id, ...props }: Props) {
  const inputId = id ?? props.name ?? `input-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <FormFieldWrapper id={inputId} label={label} error={error} description={description} required={required}>
      <Input {...props} id={inputId} required={required} aria-invalid={Boolean(error)}
        aria-describedby={[description && `${inputId}-description`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined} />
    </FormFieldWrapper>
  );
}
