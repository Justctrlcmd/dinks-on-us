"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFieldWrapper } from "./form-field-wrapper";

type Props = Omit<React.ComponentProps<typeof Input>, "type"> & { label: string; error?: string; description?: string };

export function PasswordInput({ label, error, description, required, id, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name ?? "password";
  return (
    <FormFieldWrapper id={inputId} label={label} error={error} description={description} required={required}>
      <div className="relative">
        <Input {...props} id={inputId} type={visible ? "text" : "password"} required={required}
          aria-invalid={Boolean(error)} className="pr-10" />
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0"
          onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </Button>
      </div>
    </FormFieldWrapper>
  );
}
