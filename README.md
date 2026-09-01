# Bloomani

前后端分离的 AI 动画创作台（当前为落地页 + 内容 API 骨架）。

## 工程结构

```
bloomani/
├── apps/
│   ├── web/          # React + Vite 前端
│   └── api/          # Hono 后端 API
├── packages/
│   └── shared/       # 前后端共享 TypeScript 类型
└── package.json      # npm workspaces 根配置
```

| 目录 | 职责 |
|------|------|
| `apps/web` | 页面与交互；通过 `/api` 拉内容 |
| `apps/api` | AniME 编排骨架 + 落地页内容 API |
| `packages/shared` | 落地页与 AniME 领域契约 |
| `docs/ANIME_ARCHITECTURE.md` | 架构整合说明与 API 一览 |

## 开发

```bash
npm install
npm run build -w @bloomani/shared   # 先构建共享类型
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:5173 ，已代理 /api → 3001
```

或分别开两个终端。Windows 下建议分别运行 `dev:api` 与 `dev:web`。

AniME 流水线试跑见 [`docs/ANIME_ARCHITECTURE.md`](./docs/ANIME_ARCHITECTURE.md)。

## 内容填充怎么走

1. 改 `apps/api/src/data/landing.ts`（或后续换成 DB/CMS）
2. 前端走 `apps/web/src/api/content.ts` → `GET /api/content/landing`
3. API 不可用时，前端会回退到 `apps/web/src/data/fallbackLanding.ts`

新增资源时：在 `packages/shared` 加类型 → `apps/api` 加路由 → `apps/web/src/api` 加客户端。

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev:web` | 仅前端 |
| `npm run dev:api` | 仅后端 |
| `npm run build` | 构建 shared / web / api |
| `npm run lint` | 前端 lint |
