# Bloomani

前后端分离的 AI 动画创作台（当前为落地页 + 内容 API 骨架）。

## 工程结构

```
bloomani/
├── apps/
│   ├── web/          # React + Vite 前端
│   └── api/          # Hono 后端 API（Drizzle + Postgres）
├── packages/
│   └── shared/       # 前后端共享 TypeScript 类型
├── docker-compose.yml
└── package.json      # npm workspaces 根配置
```

| 目录 | 职责 |
|------|------|
| `apps/web` | 页面与交互；通过 `/api` 拉内容 |
| `apps/api` | AniME 编排骨架 + 落地页内容 API + Postgres 持久化 |
| `packages/shared` | 落地页与 AniME 领域契约 |
| `docs/ANIME_ARCHITECTURE.md` | 架构整合说明与 API 一览 |

## 开发

```bash
npm install
docker compose up -d
npm run db:migrate -w @bloomani/api
npm run build -w @bloomani/shared
npm run dev:api
npm run dev:web
```

打开 http://localhost:5173/login 注册账号后，可在「我的」页查看项目、角色与剧情。保存创作内容需先登录。

或分别开两个终端。Windows 下建议分别运行 `dev:api` 与 `dev:web`。

数据库相关：`db:generate` / `db:migrate` / `db:push` / `db:studio`（均在 `@bloomani/api`）。无库时可设 `STORAGE_DRIVER=memory`。

AniME 流水线试跑见 [`docs/ANIME_ARCHITECTURE.md`](./docs/ANIME_ARCHITECTURE.md)。

## Agnes 渲染后端（当前默认）

图片 / 视频通过 Agnes API Hub 调用（密钥放在 `apps/api/.env`，勿提交）：

| 能力 | 模型 | 接口 |
|------|------|------|
| 文生图 / 图生图 | `agnes-image-2.5-flash` | `POST /api/generate/image` |
| 文生视频 / 图生视频 | `agnes-video-v2.0` | `POST /api/generate/video` → `GET /api/generate/video/:videoId` |

默认上游：`AGNES_BASE_URL=https://api.agnes-ai.cn/v1`

```bash
cp apps/api/.env.example apps/api/.env   # 填入 AGNES_API_KEY
npm run build -w @bloomani/shared
npm run dev:api
```

文档：[Agnes Video V2.0](https://wiki.agnes-ai.com/en/docs/agnes-video-v20) · [Agnes Image 2.5 Flash](https://www.agnes-ai.com/en/docs/agnes-image-25-flash)

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
| `npm run db:push -w @bloomani/api` | 将 Drizzle schema 推到 Postgres |
| `npm run db:generate -w @bloomani/api` | 生成 SQL 迁移 |
| `npm run db:migrate -w @bloomani/api` | 执行迁移 |
