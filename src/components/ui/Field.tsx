import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// 标签 + 字段说明 + 控件的统一样式
interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-semibold text-ink">
          {label}
        </span>
        {hint ? (
          <span className="mono-meta">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}

const controlClass =
  "w-full bg-bg-soft border border-line px-3.5 h-9 text-[13px] text-ink placeholder:text-dim rounded-md focus:outline-none focus:border-mint focus:bg-surface focus:ring-4 focus:ring-mint/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...rest } = props;
  return <input className={cn(controlClass, className)} {...rest} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className, ...rest } = props;
  return (
    <textarea
      className={cn(controlClass, "h-auto py-2.5 leading-relaxed resize-none", className)}
      {...rest}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={cn(controlClass, "cursor-pointer pr-8 appearance-none", className)}
      {...rest}
    >
      {children}
    </select>
  );
}
