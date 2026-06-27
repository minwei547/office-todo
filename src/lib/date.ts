// 日期工具：处理 YYYY-MM-DD 与显示文案

const today = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface DueState {
  label: string;
  tone: "neutral" | "warn" | "danger" | "done";
}

// 根据截止日返回展示文案与色调
export function describeDueDate(iso: string | null, done: boolean): DueState {
  if (!iso) return { label: "无截止日", tone: "neutral" };
  const due = parseISO(iso);
  if (!due) return { label: iso, tone: "neutral" };
  const t = today();
  const diffDays = Math.round(
    (due.getTime() - t.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (done) return { label: formatMD(due), tone: "done" };
  if (diffDays < 0) return { label: `逾期 ${-diffDays} 天`, tone: "danger" };
  if (diffDays === 0) return { label: "今天", tone: "danger" };
  if (diffDays === 1) return { label: "明天", tone: "warn" };
  if (diffDays <= 3) return { label: `${diffDays} 天后`, tone: "warn" };
  return { label: formatMD(due), tone: "neutral" };
}

function formatMD(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 相对时间：刚刚 / 5 分钟前 / 2 小时前 / 昨天 / 3 天前 / 9月10日
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "昨天";
  if (day < 7) return `${day} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
