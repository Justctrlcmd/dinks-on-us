import { Textarea } from "@/components/ui/textarea";
import { FormFieldWrapper } from "./form-field-wrapper";

type Props = React.ComponentProps<typeof Textarea> & { label: string; error?: string; description?: string };
export function TextareaWithLabel({ label, error, description, id, required, ...props }: Props) {
  const inputId = id ?? props.name ?? "textarea";
  return <FormFieldWrapper id={inputId} label={label} error={error} description={description} required={required}>
    <Textarea {...props} id={inputId} required={required} aria-invalid={Boolean(error)} />
  </FormFieldWrapper>;
}
