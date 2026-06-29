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
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
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
  "w-full bg-slate-50 border border-slate-300/20 px-3 h-9 text-[13px] text-slate-900 placeholder:text-muted/70 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-accent/40 transition-colors";

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
      className={cn(controlClass, "h-auto py-2 leading-relaxed resize-none", className)}
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
