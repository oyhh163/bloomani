# Bloomani AniME 架构与 API 骨架

整合 OiiOii 公开产品逻辑与 AniME 分层资料后的落地草图。目标不是训练单一万能模型，而是搭建**虚拟动画工厂**：导演调度 + 职能智能体 + 模型路由 + 全局资产记忆。

## 分层对照

| 层次 | 职责 | 本仓库落点 |
|------|------|------------|
| 用户交互层 | 托管一键 / 对话精调 | `Project.mode`: `hosted` \| `chat` |
| 智能体编排层 | 导演 + 7 职能 Agent | `packages/shared/src/anime/agents.ts` + `services/director.ts` |
| 模型路由层 | 按镜头择优调用后端 | `services/modelRouter.ts` + `GET/POST /api/meta/models*` |
| 全局资产记忆库 | 角色/场景/风格一致性 | `services/assetMemory.ts` + `/api/assets/*` |
| 基础服务层 | 队列/存储/实时进度 | 现为内存 Map；后续 Postgres + Redis + WebSocket |

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

## API 一览

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/health` | 健康检查 |
| GET/POST | `/api/projects` | 项目列表 / 创建 |
| GET | `/api/projects/:id` | 项目包（含风格/剧本） |
| GET/POST | `/api/assets/characters` | 演员库 |
| GET/POST | `/api/assets/scenes` | 场景库 |
| POST | `/api/screenplays/from-idea` | 创意 → 结构化剧本+分镜 |
| POST | `/api/screenplays/from-script` | 导入剧本 → 解析骨架 |
| POST | `/api/pipeline/start` | 导演启动流水线 |
| GET | `/api/pipeline/jobs/:id` | 任务进度（轮询；后续 WS） |
| GET | `/api/meta/agents` | Agent 名册 |
| GET | `/api/meta/models` | 模型目录 |
| POST | `/api/meta/models/route` | 路由试算 |

## 快速试跑

```bash
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
4. **记忆**：`IdentityMemory.embeddingId` → pgvector / Redis  
5. **编排**：`runPipelineStub` → LangGraph / 队列 Worker  
6. **实时**：任务进度 → WebSocket  

当前 Node/Hono 与前端同仓 TypeScript；若团队更熟 Python，可把编排 Worker 拆成 FastAPI + LangGraph，HTTP 契约保持 `@bloomani/shared` 不变。
