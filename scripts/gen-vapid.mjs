/**
 * 生成 Web Push VAPID 密钥对
 *
 * 用法：
 *   node scripts/gen-vapid.mjs
 *
 * 输出示例：
 *   ========================================
 *   VAPID 密钥对已生成
 *   ========================================
 *   Public  Key: BK...
 *   Private Key: xO...
 *
 *   请将以下内容配置到环境变量：
 *   .env.local (前端):
 *     VITE_VAPID_PUBLIC_KEY=BK...
 *
 *   Supabase Edge Function secrets (后端):
 *     supabase secrets set VAPID_PUBLIC_KEY=BK...
 *     supabase secrets set VAPID_PRIVATE_KEY=xO...
 */
import webPush from "web-push";

const vapidKeys = webPush.generateVAPIDKeys();

console.log("\n========================================");
console.log("VAPID 密钥对已生成");
console.log("========================================");
console.log(`Public  Key: ${vapidKeys.publicKey}`);
console.log(`Private Key: ${vapidKeys.privateKey}`);
console.log("\n请将以下内容配置到环境变量：");
console.log("\n.env.local (前端):");
console.log(`  VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log("\nSupabase Edge Function secrets (后端):");
console.log(`  supabase secrets set VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`  supabase secrets set VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("\n注意：Private Key 务必保密，切勿提交到 Git 仓库。\n");
