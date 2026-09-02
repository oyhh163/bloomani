# Bloomani AniME 架构与 API 骨架

整合 OiiOii 公开产品逻辑与 AniME 分层资料后的落地草图。目标不是训练单一万能模型，而是搭建**虚拟动画工厂**：导演调度 + 职能智能体 + 模型路由 + 全局资产记忆。

## 分层对照

| 层次 | 职责 | 本仓库落点 |
|------|------|------------|
| 用户交互层 | 托管一键 / 对话精调 | `Project.mode`: `hosted` \| `chat` |
| 智能体编排层 | 导演 + 7 职能 Agent | `packages/shared/src/anime/agents.ts` + `services/director.ts` |
| 模型路由层 | 按镜头择优调用后端 | `services/modelRouter.ts` + `GET/POST /api/meta/models*` |
| 全局资产记忆库 | 角色/场景/风格一致性 | `repositories/*` + `/api/assets/*`（默认 Postgres） |
| 基础服务层 | 队列/存储/实时进度 | Postgres 持久化（项目/资产/剧本/流水线）；任务进度后续可加 Redis + WebSocket |

## 标准流水线

```
创意/剧本
 → art_direction（艺术总监）
 → screenplay（编剧）
 → character_design / scene_design（资产）
 → storyboard（分镜师 → ShotSpec[]）
 → animate（动画师 + 路由选模）
 → edit / audio（后期与音频）
 → export
```

`ShotSpec` 是可执行单元：时长、景别、运镜、动作、对白、continuity、注入资产后的 `visualPrompt`、以及 `selectedModelId`。思路对齐 PenShot 类「剧本 → 适配视频模型的提示词」拆解。

## Agnes 渲染后端

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/generate/status` | 是否已配置 Key / 当前模型 |
| POST | `/api/generate/image` | 文生图 / 图生图（`agnes-image-2.5-flash`） |
| POST | `/api/generate/video` | 创建视频任务（`agnes-video-v2.0`） |
| GET | `/api/generate/video/:videoId` | 轮询视频结果 |

密钥仅放在 `apps/api/.env` 的 `AGNES_API_KEY`，勿提交仓库。

## 账号与个人页

- 注册 / 登录：`POST /api/auth/register`、`POST /api/auth/login`（密码 scrypt 哈希入库，会话 token 存 `sessions`）
- 当前用户：`GET /api/auth/me`
- 个人创作汇总：`GET /api/auth/workspace`（项目 / 角色 / 剧情草稿）
- 前端：`/login`、`/me`；保存角色与剧情需登录，内容按 `user_id` 隔离

## 持久化（Postgres + Drizzle）

已落库：`users`、`projects`、`project_characters`、`characters` / `character_sheets`、`scenes`、`styles`、`story_drafts`、`screenplays`、`pipeline_jobs`、`timelines`。默认用户 `local`。开关：`STORAGE_DRIVER=postgres|memory`。

流水线每阶段会写回 `pipeline_jobs` 与 `projects`，API 重启后仍可 `GET /api/pipeline/jobs/:id` 续查。

未做（可选三期）：pgvector 身份向量、Agnes 图本地/对象存储镜像。

```bash
docker compose up -d
npm run db:migrate -w @bloomani/api
npm run build -w @bloomani/shared
npm run dev:api
```

`GET /api/health` 返回 `storageDriver` 与 `db: "up"|"down"|"skipped"`。

## API 一览

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/health` | 健康检查（含 db 状态） |
| GET/POST | `/api/projects` | 项目列表 / 创建 |
| GET | `/api/projects/:id` | 项目包（含风格/剧本） |
| GET/POST | `/api/assets/characters` | 演员库（Postgres） |
| DELETE | `/api/assets/characters/:id` | 删除角色 |
| GET/POST | `/api/assets/scenes` | 场景库（Postgres） |
| GET/POST | `/api/story-drafts` | 剧情草稿 CRUD |
| PATCH/DELETE | `/api/story-drafts/:id` | 更新 / 删除草稿 |
| POST | `/api/screenplays/from-idea` | 创意 → 结构化剧本+分镜（Postgres） |
| POST | `/api/screenplays/from-script` | 导入剧本 → 解析骨架 |
| POST | `/api/pipeline/start` | 导演启动流水线（job 落库） |
| GET | `/api/pipeline/jobs` | 任务列表 |
| GET | `/api/pipeline/jobs/:id` | 任务进度（轮询；重启可续查） |
| GET | `/api/meta/agents` | Agent 名册 |
| GET | `/api/meta/models` | 模型目录 |
| POST | `/api/meta/models/route` | 路由试算 |

## 快速试跑

```bash
docker compose up -d
npm run db:migrate -w @bloomani/api
npm run build -w @bloomani/shared
npm run dev:api

# 创建项目
curl -s -X POST http://localhost:3001/api/projects \
  -H "content-type: application/json" \
  -d "{\"idea\":\"一只会发光的小猫第一次进城\"}"

# 启动托管流水线（把返回的 project.id 填入）
curl -s -X POST http://localhost:3001/api/pipeline/start \
  -H "content-type: application/json" \
  -d "{\"projectId\":\"proj_xxx\",\"mode\":\"hosted\"}"
```

## 后续替换点

1. **LLM**：编剧/分镜/艺术总监 → Claude / GPT 结构化输出  
2. **图像**：角色三视图 / 场景板 → Flux / Midjourney  
3. **视频**：按 `routeModel` 决策调 Sora / Veo / Kling 等  
4. **记忆**：`IdentityMemory.embeddingId` → pgvector / Redis（可选三期）  
5. **编排**：`runPipelineStub` → LangGraph / 队列 Worker  
6. **实时**：任务进度 → WebSocket  
7. **媒体**：Agnes URL 镜像到本地 / 对象存储（可选三期）  

当前 Node/Hono 与前端同仓 TypeScript；若团队更熟 Python，可把编排 Worker 拆成 FastAPI + LangGraph，HTTP 契约保持 `@bloomani/shared` 不变。
