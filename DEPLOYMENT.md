# 公网测试版部署说明

目标部署方式：

- 前端：Vercel
- 后端：Vercel Functions，同一个项目里的 `/api/health` 与 `/api/interpret`
- 模型密钥：只放 Vercel 服务端环境变量
- 登录：Supabase Auth，前端只使用 public URL 和 anon key

## 部署前检查

本项目已经按公网测试版做了以下适配：

- `npm run build` 会输出 Vite 前端产物到 `dist`。
- `api/health.ts` 提供 `GET /api/health`。
- `api/interpret.ts` 提供 `POST /api/interpret`。
- Vercel Functions 复用 `server/env.ts` 与 `server/llmClient.ts`，走 OpenAI-compatible `chat/completions`。
- 前端开发环境和生产环境都请求同域 `/api/interpret`。
- 本地开发时，Vite proxy 会把 `/api` 转发到 `http://127.0.0.1:8787`，需要另开 `npm run server`。
- 生产环境不需要 Railway，也不需要 `VITE_API_BASE_URL`。
- Supabase service role key 不进入前端，也不要提交到仓库。
- `.env` 已加入 `.gitignore`，不要提交真实 API key。

## Vercel 环境变量

在 Vercel 项目里配置服务端模型变量：

```text
LLM_PROVIDER=deepseek
LLM_API_KEY=你的 DeepSeek API key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
```

再配置前端公开变量：

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=你的 Supabase anon public key
VITE_SUPPORT_URL=你的打赏页链接（可选；国内用户建议爱发电 afdian.com，海外可用 Ko-fi；不配置则不显示支持入口）
```

不要在 Vercel 配置 `VITE_LLM_API_KEY`、`VITE_OPENAI_API_KEY`、Supabase `service_role` key，或任何会进入前端 bundle 的真实模型密钥。

## 部署到 Vercel

1. 在 Vercel 新建或打开当前项目。
2. Framework Preset 选择 Vite。
3. Build Command 使用：

```bash
npm run build
```

4. Output Directory 使用：

```text
dist
```

5. 配置上面的环境变量。
6. 重新部署。

## 测试后端健康检查

替换成你的正式域名：

```bash
curl https://www.guantian.xyz/api/health
```

正常返回示例：

```json
{
  "ok": true,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "hasKey": true
}
```

`hasKey` 只表示是否配置了密钥，不会返回密钥明文。

## 测试后端解读接口

```bash
curl -X POST https://www.guantian.xyz/api/interpret \
  -H "Content-Type: application/json" \
  -d '{"prompt":"请用一句话回复：连接正常。"}'
```

如果模型配置正确，会返回：

```json
{
  "markdown": "..."
}
```

## Supabase Auth 配置

Supabase 项目中需要：

1. 执行 `supabase/schema.sql`。
2. 开启 Email provider。
3. 如需 Google 登录，开启 Google provider 并填写 OAuth 配置。
4. 在 Authentication → URL Configuration 中设置：

```text
Site URL=https://www.guantian.xyz
```

Redirect URLs 至少加入：

```text
https://www.guantian.xyz
http://localhost:5173
http://127.0.0.1:5173
```

如果使用 Vercel Preview 域名，也要把对应 preview 域名加入 Redirect URLs。

## 部署顺序

1. 在 Vercel 配置 `LLM_PROVIDER / LLM_API_KEY / LLM_BASE_URL / LLM_MODEL`。
2. 在 Vercel 配置 `VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY`。
3. 部署 Vercel。
4. 测试 `/api/health`。
5. 测试 `/api/interpret`。
6. 在 Supabase 配置正式域名为 Site URL 和 Redirect URL。
7. 打开正式域名，测试 Email magic link。
8. 登录后正式起筮一次，再刷新或复位尝试第二次起筮，确认“一天一卦”提示生效。
9. 成卦后点“此卦照见”，确认 Vercel Function 解读接口正常。

## 常见错误

### API key 未配置

现象：

- `/api/health` 返回 `hasKey: false`
- `/api/interpret` 返回缺少 `LLM_API_KEY`

处理：在 Vercel 环境变量里补充 `LLM_API_KEY`，不要把 key 写进前端或提交到仓库。

### 模型名错误

现象：`/api/interpret` 返回模型不存在、无权限、404 或 provider 侧错误。

处理：去 DeepSeek 控制台确认 `LLM_MODEL` 的准确名称。当前默认建议是：

```text
LLM_MODEL=deepseek-chat
```

### 前端仍请求 Railway

现象：线上页面请求 `up.railway.app` 或缺少 `VITE_API_BASE_URL`。

处理：

- 确认最新代码已部署。
- 确认前端 bundle 来自包含 `api/interpret.ts` 的提交。
- 浏览器硬刷新。

### Magic link 回不到网站

现象：邮件能收到，但点开后没有回到 Vercel 网站，或登录状态没有生效。

处理：

- 确认 Supabase `Site URL` 是 Vercel 正式域名。
- 确认 `Redirect URLs` 包含 Vercel 正式域名。
- 如果在本地测试，加入 `http://localhost:5173` 和 `http://127.0.0.1:5173`。
- 修改 Supabase URL 配置后重新发送 magic link。

### 每日一卦限制不生效

现象：同一账号一天可以多次正式起筮。

处理：

- 确认 `supabase/schema.sql` 已执行。
- 确认 Supabase 中存在 `public.claim_daily_cast()`。
- 确认 `guantian_profiles` 表开启 RLS。
- 确认前端已配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
