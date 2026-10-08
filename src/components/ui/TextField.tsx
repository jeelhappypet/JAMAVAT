import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const inputBase = "w-full border border-stone-300 bg-surface text-base font-normal text-foreground placeholder:text-stone-400 disabled:opacity-60";

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

function Field({ label, hint, className, children }: FieldProps & { children: ReactNode }) {
  if (!label && !hint) return <>{children}</>;
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-bold", className)}>
      {label}
      {children}
      {hint ? <span className="text-[13px] font-normal text-text-muted">{hint}</span> : null}
    </label>
  );
}

type TextFieldProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size"> & { size?: "sm" | "md"; inputClassName?: string };

/** Text / number / email / tel / url / password input with an optional label and hint. */
export function TextField({ label, hint, className, size = "md", inputClassName, ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input className={cn(inputBase, size === "sm" ? "h-10 rounded-[10px] px-2.5" : "h-12 rounded-xl px-3.5", !label && !hint && className, inputClassName)} {...rest} />
    </Field>
  );
}

type TextAreaProps = FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function TextArea({ label, hint, className, rows = 2, ...rest }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <textarea rows={rows} className={cn(inputBase, "resize-none rounded-[10px] bg-stone-50 px-3 py-2.5 text-sm outline-none", !label && !hint && className)} {...rest} />
    </Field>
  );
}

type DateInputProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type" | "onChange"> & { onChange: (value: string) => void };

/** Date picker: the phone's native calendar, styled like the other fields. Value is YYYY-MM-DD. */
export function DateInput({ label, hint, className, onChange, ...rest }: DateInputProps) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input type="date" onChange={(e) => onChange(e.target.value)} className={cn(inputBase, "h-12 rounded-xl px-3.5", !label && !hint && className)} {...rest} />
    </Field>
  );
}
