import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { StudioLayout } from '../components/layout/StudioLayout'

export function GeneratePage() {
  const reduceMotion = useReducedMotion()

  return (
    <StudioLayout
      eyebrow="03 · 内容生成"
      title="角色与剧情就绪后，一键开拍"
      lead="成片管线稍后接入。你可以先完成角色与剧情，再回到这里生成视频。"
    >
      <motion.section
        className="studio-panel generate-placeholder"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="generate-visual" aria-hidden="true">
          <span className="gen-ring" />
          <span className="gen-play" />
        </div>
        <h2>内容生成 · 待定</h2>
        <p className="panel-desc">
          这里将串联 AniME 流水线：分镜、模型路由、镜头渲染与后期合成。当前页面先占位，方便你先走通角色与剧情。
        </p>
        <div className="panel-actions">
          <Link className="btn btn-primary" to="/character">
            去角色设计
          </Link>
          <Link className="btn btn-ghost" to="/story">
            去剧情设计
          </Link>
        </div>
      </motion.section>
    </StudioLayout>
  )
}
