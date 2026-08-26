import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormFieldWrapper } from "./form-field-wrapper";
describe("FormFieldWrapper", () => { it("associates its label and renders a compact accessible error", () => { render(<FormFieldWrapper id="email" label="Email" error="Invalid email"><input id="email" /></FormFieldWrapper>); expect(screen.getByLabelText("Email")).toBeInTheDocument(); expect(screen.getByRole("alert")).toHaveTextContent("Invalid email"); expect(screen.getByRole("alert")).toHaveClass("text-xs", "leading-4"); }); });
