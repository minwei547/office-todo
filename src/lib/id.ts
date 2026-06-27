// 生成短 ID：时间戳 base36 + 随机后缀
export function shortId(prefix = ""): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}${t}${r}`;
}

// 生成 6 位邀请口令（大写字母 + 数字，去除易混淆字符 0/O/1/I）
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

// 取昵称首字作为头像字
export function avatarCharFrom(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) return "?";
  // 取首个非空白字符
  return Array.from(trimmed)[0]!.toUpperCase();
}
