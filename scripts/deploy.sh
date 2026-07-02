#!/usr/bin/env bash
# 一键部署脚本：构建 + 打包 dist 为 ZIP，供 Cloudflare Pages 上传
# 用法：bash scripts/deploy.sh
set -e

cd "$(dirname "$0")/.."

echo "▶ 1/4 安装依赖..."
npm install --silent

echo "▶ 2/4 类型检查..."
npx tsc --noEmit

echo "▶ 3/4 构建生产包..."
npm run build

echo "▶ 4/4 打包 dist 为 ZIP..."
ZIP_NAME="dist-$(date +%Y%m%d-%H%M%S).zip"
cd dist
zip -r -q "../$ZIP_NAME" .
cd ..

echo ""
echo "✅ 构建完成！"
echo ""
echo "产物："
echo "  - dist/          （可直接上传到静态托管）"
echo "  - $ZIP_NAME  （Cloudflare Pages 后台拖拽上传用）"
echo ""
echo "部署方式二选一："
echo ""
echo "【方式A】Cloudflare Pages 后台手动上传（推荐，无需配置）"
echo "  1. 打开 https://dash.cloudflare.com → Pages → 你的项目（office-todo）"
echo "  2. 点 'Create deployment' → 'Upload assets'"
echo "  3. 把 $ZIP_NAME 解压后的所有文件拖进去（或直接拖 dist/ 目录内容）"
echo "  4. 点 'Deploy'，等几秒即可"
echo "  5. 手机关掉App重开，即可拿到新代码"
echo ""
echo "【方式B】wrangler CLI 命令行部署（需先 npm i -g wrangler 并 wrangler login）"
echo "  wrangler pages deploy dist --project-name=office-todo"
echo ""
