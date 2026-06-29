import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./Button";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = "w-[440px] max-w-[92vw]",
}: DrawerProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 滚动锁
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* 遮罩：柔和磨砂 */}
      <button
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(220,220,230,0.4)] backdrop-blur-[4px] animate-fade-in"
      />
      {/* 抽屉本体：奶白磨砂玻璃 */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full bg-surface/95 border-l border-line shadow-lift flex flex-col animate-slide-in backdrop-blur-xl",
          widthClass,
        )}
      >
        <header className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-line">
          <div className="min-w-0">
            <div className="font-sans text-[19px] font-semibold text-ink leading-tight">
              {title}
            </div>
            {subtitle ? (
              <div className="mono-meta mt-1">{subtitle}</div>
            ) : null}
          </div>
          <IconButton onClick={onClose} aria-label="关闭抽屉">
            <X size={18} />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? (
          <footer className="px-6 py-3 border-t border-line bg-bg-soft">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
