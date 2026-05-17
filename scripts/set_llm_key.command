#!/bin/bash
set -euo pipefail

PROJECT_DIR="/Users/moujingyi/Documents/codex/dayan-yarrow-fps"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
fi

printf "请输入 MiMo API Key（输入不会显示）："
IFS= read -rs LLM_API_KEY_INPUT
printf "\n"

if [ -z "$LLM_API_KEY_INPUT" ]; then
  echo "未输入 API key，已取消写入。"
  exit 1
fi

export LLM_API_KEY_INPUT
node -e '
const fs = require("fs");
const path = ".env";
const updates = {
  LLM_PROVIDER: "mimo",
  LLM_API_KEY: process.env.LLM_API_KEY_INPUT,
  LLM_BASE_URL: "https://api.xiaomimimo.com/v1",
  LLM_MODEL: "mimo-v2-flash",
};
const existing = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
const lines = existing.split(/\r?\n/).filter((line) => line.length > 0);
const seen = new Set();
const next = lines.map((line) => {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (!match || !(match[1] in updates)) return line;
  const key = match[1];
  seen.add(key);
  return `${key}=${updates[key]}`;
});
for (const [key, value] of Object.entries(updates)) {
  if (!seen.has(key)) next.push(`${key}=${value}`);
}
fs.writeFileSync(path, `${next.join("\n")}\n`, "utf8");
'
unset LLM_API_KEY_INPUT

echo ".env 已写入，API key 未打印。"
echo "可以关闭此窗口。"
