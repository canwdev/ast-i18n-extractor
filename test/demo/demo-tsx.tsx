// TSX 示例：覆盖类型声明、as const 数组、数字变体合并、枚举、三元、已有 t() 复用
import { useMemo, useState } from 'react'

interface StepProps {
  title: string
  hint?: string
}

// 只有末尾数字不同的文案（Step 1/2/3）会合并为一个 `Step {0}` key
const STEPS = ['Step 1', 'Step 2', 'Step 3'] as const

const STATUS_LABEL: Record<string, string> = {
  active: 'Active Status',
  paused: 'Paused Status',
}

enum Plan {
  Free = 'Free plan',
  Pro = 'Pro plan',
}

function Step({ title, hint }: StepProps) {
  return (
    <li title={title}>
      {title}
      {hint && <small>{hint}</small>}
    </li>
  )
}

export function SetupWizard({ plan, current }: { plan: Plan, current: number }) {
  const [expanded, setExpanded] = useState(false)
  const progress = useMemo(() => `Setup progress is ${current} of 3`, [current])

  return (
    <section data-testid="setup-wizard" className="wizard-root">
      <h2>{STATUS_LABEL.active}</h2>
      <p>{plan === Plan.Pro ? 'Your Pro plan is active' : 'Upgrade to unlock more features'}</p>
      <p>{progress}</p>

      <ol>
        {STEPS.map(step => <Step key={step} title={step} hint="Tap to expand" />)}
      </ol>

      {/* 条件渲染里的文案同样会被抽取 */}
      <button type="button" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {/* 已有 t() key 进入「已有 Key」列表，不重复生成 */}
      <button type="button">{t('app.continue_setup')}</button>
    </section>
  )
}
