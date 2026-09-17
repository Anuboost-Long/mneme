import clsx from "clsx";
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { BodyText, Caption, Typography } from "./Typography";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
};

export type TextInputProps = FieldProps & ComponentPropsWithRef<"input">;
export type TextAreaProps = FieldProps & ComponentPropsWithRef<"textarea">;

function fieldClassName(className?: string) {
  return clsx(
    "block w-full min-w-0 rounded-md",
    "bg-surface border border-ink/20",
    "text-sm font-normal text-ink placeholder:text-muted",
    "px-3 py-2.5",
    "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
    "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger",
    "disabled:cursor-not-allowed disabled:opacity-50 read-only:bg-sidebar",
    className,
  );
}

function describedBy(id: string, hint?: string, error?: string, external?: string) {
  return [external, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

function Field({ id, label, hint, error, required, fieldClassName, children }: Readonly<FieldProps & {
  id: string;
  required?: boolean;
  children: ReactNode;
}>) {
  return (
    <div className={clsx("min-w-0 space-y-2", fieldClassName)}>
      <label htmlFor={id} className={clsx("block")}>
        <Typography as="span" variant="label">{label}</Typography>{" "}
        <Typography as="span" tone="muted">({required ? "required" : "optional"})</Typography>
      </label>
      {children}
      {hint && <Caption id={`${id}-hint`} tone="muted">{hint}</Caption>}
      {error && <BodyText id={`${id}-error`} role="alert" tone="error">{error}</BodyText>}
    </div>
  );
}

export function TextInput({
  label, hint, error, fieldClassName: wrapperClassName,
  id, className, type = "text", ...props
}: Readonly<TextInputProps>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={props.required} fieldClassName={wrapperClassName}>
      <input
        {...props}
        id={inputId}
        type={type}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy(inputId, hint, error, props["aria-describedby"])}
        className={fieldClassName(clsx("h-11", className))}
      />
    </Field>
  );
}

export function TextArea({
  label, hint, error, fieldClassName: wrapperClassName,
  id, className, rows = 3, ...props
}: Readonly<TextAreaProps>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={props.required} fieldClassName={wrapperClassName}>
      <textarea
        {...props}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy(inputId, hint, error, props["aria-describedby"])}
        className={fieldClassName(clsx("resize-y", className))}
      />
    </Field>
  );
}
