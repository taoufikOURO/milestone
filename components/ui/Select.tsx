import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { FIELD_CLASSES, FieldMessage, fieldBorder } from "@/components/ui/Input";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Liste déroulante native, même API que Input (options passées en enfants). */
export function Select({ label, name, error, hint, className = "", children, ...props }: SelectProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-text-primary">
        {label}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${FIELD_CLASSES} ${fieldBorder(error)} cursor-pointer appearance-none pr-10 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 mt-[3px] size-4 -translate-y-1/2 text-text-secondary"
        />
      </div>
      <FieldMessage name={name} error={error} hint={hint} />
    </div>
  );
}
