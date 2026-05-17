# 公网测试版部署说明

目标部署方式：

- 前端：Vercel
- 后端：Railway
- 模型密钥：只放 Railway 环境变量
- 前端通过 `VITE_API_BASE_URL` 调 Railway 后端

## 部署前检查

本项目已经按公网测试版做了以下适配：

- `npm run build` 会输出 Vite 前端产物到 `dist`。
- `npm run server` 会启动后端 API。
- 后端读取 `process.env.PORT`，没有时回退到 `8787`。
- 后端监听 `0.0.0.0`，适合 Railway 容器环境。
- `package.json` 要求 Node `>=22.18.0`，用于直接运行当前 `server/*.ts`。
- 后端提供 `GET /api/health`。
- 后端测试阶段默认允许 `*` CORS，也可用 `CORS_ORIGIN` 收紧。
- 前端开发环境继续请求 `/api/interpret`，由 Vite proxy 转发到本地后端。
- 前端生产环境请求 `${VITE_API_BASE_URL}/api/interpret`。
- `.env` 已加入 `.gitignore`，不要提交真实 API key。

## 后端部署到 Railway

1. 在 Railway 新建项目。
2. 连接当前代码仓库，或用 Railway CLI 从项目根目录部署。
3. Railway 会使用 `railway.json` 中的启动命令：

```bash
npm run server
```

4. 在 Railway 项目里配置环境变量：

```text
LLM_PROVIDER=mimo
LLM_API_KEY=你的真实 key
LLM_BASE_URL=https://api.xiaomimimo.com/v1
LLM_MODEL=mimo-v2-flash
```

可选：

```text
CORS_ORIGIN=https://你的-vercel-前端域名.vercel.app
```

测试阶段可以不配置 `CORS_ORIGIN`，后端会允许 `*`。

## 获取 Railway 后端域名

部署完成后，在 Railway 服务页生成或查看 Public Domain。

形如：

```text
https://your-service-name.up.railway.app
```

这个地址就是前端生产环境要填的 `VITE_API_BASE_URL`。

## 测试后端健康检查

替换成你的 Railway 后端域名：

```bash
curl https://your-service-name.up.railway.app/api/health
```

正常返回示例：

```json
{
  "ok": true,
  "provider": "mimo",
  "model": "mimo-v2-flash",
  "hasKey": true
}
```

`hasKey` 只表示是否配置了密钥，不会返回密钥明文。

## 测试后端解读接口

```bash
curl -X POST https://your-service-name.up.railway.app/api/interpret \
  -H "Content-Type: application/json" \
  -d '{"prompt":"请用一句话回复：连接正常。"}'
```

如果模型配置正确，会返回：

```json
{
  "markdown": "..."
}
```

## 前端部署到 Vercel

1. 在 Vercel 新建项目。
2. 选择当前仓库。
3. Framework Preset 选择 Vite。
4. Build Command 使用：

```bash
npm run build
```

5. Output Directory 使用：

```text
dist
```

6. 在 Vercel 环境变量中配置：

```text
VITE_API_BASE_URL=https://your-service-name.up.railway.app
```

不要在 Vercel 配置 `LLM_API_KEY`，也不要添加 `VITE_LLM_API_KEY`。

## 部署顺序

1. 先部署 Railway 后端。
2. 配置 Railway 的 `LLM_PROVIDER / LLM_API_KEY / LLM_BASE_URL / LLM_MODEL`。
3. 测试 Railway `/api/health`。
4. 测试 Railway `/api/interpret`。
5. 拿到 Railway 后端域名。
6. 部署 Vercel 前端。
7. 在 Vercel 配置 `VITE_API_BASE_URL` 为 Railway 后端域名。
8. 打开 Vercel 前端链接，完成一次“测试成卦”或正式起筮，再点“此卦照见”。

## 常见错误

### CORS

现象：浏览器控制台出现 CORS 错误。

处理：

- 测试阶段保持后端默认 `*`。
- 正式收紧时，在 Railway 设置：

```text
CORS_ORIGIN=https://你的-vercel-前端域名.vercel.app
```

### API key 未配置

现象：

- `/api/health` 返回 `hasKey: false`
- `/api/interpret` 返回缺少 `LLM_API_KEY`

处理：在 Railway 环境变量里补充 `LLM_API_KEY`，不要把 key 写进前端或提交到仓库。

### 模型名错误

现象：`/api/interpret` 返回模型不存在、无权限、404 或 provider 侧错误。

处理：去 MiMo 或 DeepSeek 控制台确认 `LLM_MODEL` 的准确名称。

### 前端仍请求 localhost

现象：线上 Vercel 页面请求 `127.0.0.1`、`localhost` 或同域 `/api/interpret` 失败。

处理：

- 确认 Vercel 配置了 `VITE_API_BASE_URL`。
- 修改后重新部署前端。
- 浏览器硬刷新。

### Railway 休眠或冷启动

现象：第一次点击“此卦照见”较慢，或请求超时。

处理：等待服务冷启动完成后重试。测试阶段这是正常现象。
