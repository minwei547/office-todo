import { cn } from "@/lib/utils";

interface AvatarProps {
  char: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

const sizeClass = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-12 w-12 text-[15px]",
};

// 马卡龙色板，循环使用
const MACARON = [
  { bg: "linear-gradient(135deg, #c8e9dd 0%, #a8d8c0 100%)", fg: "#2a5a4a" }, // 薄荷
  { bg: "linear-gradient(135deg, #c6e2f5 0%, #a8d0eb 100%)", fg: "#2a4a6a" }, // 天蓝
  { bg: "linear-gradient(135deg, #d9d4f0 0%, #b8b3dc 100%)", fg: "#5a4a78" }, // 丁香
  { bg: "linear-gradient(135deg, #f5d9c8 0%, #e8b8a0 100%)", fg: "#7a5c4a" }, // 蜜桃
  { bg: "linear-gradient(135deg, #f3e9c6 0%, #e0d09a 100%)", fg: "#6a5c3a" }, // 奶油
  { bg: "linear-gradient(135deg, #c8e9dd 0%, #c6e2f5 100%)", fg: "#2a4a5a" }, // 薄荷+天蓝
];

function idxFromChar(char: string): number {
  const code = char.charCodeAt(0) ?? 0;
  return code % MACARON.length;
}

export function Avatar({ char, size = "sm", className, title }: AvatarProps) {
  const c = MACARON[idxFromChar(char)];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-sans font-semibold uppercase select-none border-2 border-surface shadow-sm",
        sizeClass[size],
        className,
      )}
      style={{ background: c.bg, color: c.fg }}
    >
      {char}
    </span>
  );
}
