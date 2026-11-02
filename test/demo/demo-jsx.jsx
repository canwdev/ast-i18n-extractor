// JSX 示例：覆盖文本节点、静态属性、三元表达式、模板字符串、配置键跳过、已有 t() 复用
import { useState } from 'react'

// 配置对象的 name / id / type / className 属于代码标识，不抽取
const PANEL_CONFIG = {
  name: 'WelcomePanel',
  id: 'welcome-panel',
  type: 'aside',
  className: 'panel-root',
}

const SECTIONS = ['Overview', 'Members', 'Billing']

export function WelcomePanel({ userName, unreadCount }) {
  const [section, setSection] = useState(SECTIONS[0])
  const greeting = `Welcome back, ${userName}`
  const summary = unreadCount > 1 ? 'You have several unread messages' : 'You have one unread message'

  return (
    <aside className={PANEL_CONFIG.className} data-testid="welcome-panel">
      <h1 title="Account overview">{greeting}</h1>
      <p>{summary}</p>

      {/* 静态属性值会抽取；src / href 等地址类属性不会 */}
      <input placeholder="Search members" />
      <img src="/icons/avatar.png" alt="Member avatar" />

      <nav>
        {SECTIONS.map(name => (
          <button key={name} type="button" onClick={() => setSection(name)}>
            {name}
          </button>
        ))}
      </nav>

      <a href="/help">Read the guide</a>

      {/* 已存在的 t() key 会被识别为「已有 Key」，不会重复生成 */}
      <button type="button" onClick={() => setSection(SECTIONS[0])}>
        {t('app.back_to_overview')}
      </button>
    </aside>
  )
}
