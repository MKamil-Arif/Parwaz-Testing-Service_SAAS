import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { FieldError } from "./form-client";

export const inputClasses =
  "block w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-950 shadow-[0_1px_0_rgb(10_20_45/0.03)] placeholder:text-navy-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-100 disabled:bg-navy-50 disabled:text-navy-500";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClasses, "min-h-24", className)} {...props} />;
}

type Option = { value: string; label: string } | string;

export function Select({
  options,
  placeholder,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: readonly Option[]; placeholder?: string }) {
  return (
    <select className={cn(inputClasses, "pr-9", className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

/** Label + control + hint + validation error (errors come from the surrounding <ActionForm>). */
export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={name} className="block text-sm font-medium text-navy-800">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-navy-500">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
  required,
  hint,
}: {
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
  required?: boolean;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-navy-800">
        <input
          type="checkbox"
          id={name}
          name={name}
          defaultChecked={defaultChecked}
          required={required}
          className="mt-0.5 size-4 shrink-0 rounded border-navy-300 text-brand-600 accent-brand-600"
        />
        <span>{label}</span>
      </label>
      {hint && <p className="mt-1 pl-7 text-xs text-navy-500">{hint}</p>}
      <div className="pl-7">
        <FieldError name={name} />
      </div>
    </div>
  );
}
