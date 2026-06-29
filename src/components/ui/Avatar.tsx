import { cn } from "@/lib/utils";

interface AvatarProps {
  char: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

const sizeClass = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-[13px]",
  lg: "h-10 w-10 text-[15px]",
};

// 用字符串生成稳定色相，让不同昵称头像有差异化色调
function hueFromChar(char: string): number {
  const code = char.charCodeAt(0) ?? 0;
  return (code * 37) % 360;
}

export function Avatar({ char, size = "sm", className, title }: AvatarProps) {
  const hue = hueFromChar(char);
  // 深色底 + 高饱和前景，呼应 trae.cn 的科技玻璃质感
  const bg = `hsl(${hue} 60% 22% / 0.6)`;
  const fg = `hsl(${hue} 80% 75%)`;
  const border = `hsl(${hue} 60% 55% / 0.4)`;
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-mono font-semibold uppercase select-none border backdrop-blur-sm",
        sizeClass[size],
        className,
      )}
      style={{ backgroundColor: bg, color: fg, borderColor: border }}
    >
      {char}
    </span>
  );
}
