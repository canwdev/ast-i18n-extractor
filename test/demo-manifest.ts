/**
 * 示例代码清单：前端「示例」下拉框与 CLI 测试共用同一份定义。
 * - 源码文件本身放在 test/demo/，前端通过 import.meta.glob('?raw') 加载，
 *   测试则把同一批文件跑一遍 CLI，因此示例即测试夹具。
 * - `replaced` / `kept` / `existingKeys` 是测试断言：既保证示例覆盖到对应特性，
 *   也防止工具改动后静默回归。
 */
export interface DemoCase {
  /** test/demo/ 下的文件名 */
  fileName: string
  /** 下拉框显示名（技术标识，不参与翻译） */
  label: string
  /** 写回后源码中不应再出现的原文（应被替换为 t() / $t() 调用） */
  replaced: readonly string[]
  /** 写回后必须原样保留的片段（代码标识、技术数据、调试参数等） */
  kept: readonly string[]
  /** 源文件里已有的 key：应被识别为「已有 Key」，且不会重复生成 */
  existingKeys: readonly string[]
  /** 期望生成的关键条目：验证数字变体合并与 {0} 占位符的结果 */
  expectedMessages?: Readonly<Record<string, string>>
}

export const DEMO_CASES: readonly DemoCase[] = [
  {
    fileName: 'demo-js.js',
    label: 'JavaScript — demo-js.js',
    replaced: [
      'Choose the right format for your workflow',
      'Please select a format first',
      'Retry attempt ${count}',
      'Compare ${this.rows.length} formats',
      'Compression Option',
      'Video Quality',
    ],
    kept: [
      "name: 'ComparePanel'",
      "class: 'compare-root'",
      "text.replace(' ', '-')",
      "new Error('Nothing to compare')",
      "console.log('debug only, console arguments are skipped')",
      "this.$t('compare.section_title')",
    ],
    existingKeys: ['compare.section_title'],
    expectedMessages: { 'app.compare_0_formats': 'Compare {0} formats', 'app.retry_attempt_0': 'Retry attempt {0}' },
  },
  {
    fileName: 'demo-ts.ts',
    label: 'TypeScript — demo-ts.ts',
    replaced: [
      'We compared ${rows.value.length} features',
      'Only ${seatCount.value} seats left',
      'Built for large teams',
      'Pick a plan to see the details',
      'Compression Option',
    ],
    kept: [
      "Free = 'free',",
      "endpoint.replace('/v1', '/v2')",
      "new Error('Nothing to compare')",
      "const deviceTag = 'ABC-123'",
      "const pixelSize = '1234x567'",
      "const unitPrice = '$9.99'",
      "$t('compare.validation_passed')",
      "console.log('debug only, console arguments are skipped')",
    ],
    existingKeys: ['compare.validation_passed'],
    expectedMessages: { 'app.we_compared_0_features': 'We compared {0} features', 'app.only_0_seats_left': 'Only {0} seats left' },
  },
  {
    fileName: 'demo-jsx.jsx',
    label: 'JSX — demo-jsx.jsx',
    replaced: [
      'Welcome back, ${userName}',
      'You have several unread messages',
      'Account overview',
      'Search members',
      'Member avatar',
      'Read the guide',
    ],
    kept: [
      "id: 'welcome-panel'",
      "className: 'panel-root'",
      'data-testid="welcome-panel"',
      'src="/icons/avatar.png"',
      'href="/help"',
      "{t('app.back_to_overview')}",
    ],
    existingKeys: ['app.back_to_overview'],
    expectedMessages: { 'app.welcome_back_0': 'Welcome back, {0}', 'app.overview': 'Overview' },
  },
  {
    fileName: 'demo-tsx.tsx',
    label: 'TSX — demo-tsx.tsx',
    replaced: [
      'Setup progress is ${current} of 3',
      'Your Pro plan is active',
      "'Step 1'",
      'Active Status',
      'Tap to expand',
      'Show details',
    ],
    kept: [
      'data-testid="setup-wizard"',
      'className="wizard-root"',
      "Free = 'Free plan',",
      "{t('app.continue_setup')}",
    ],
    existingKeys: ['app.continue_setup'],
    expectedMessages: { 'app.step': 'Step {0}', 'app.setup_progress_is_0_of_3': 'Setup progress is {0} of 3' },
  },
  {
    fileName: 'vue2.vue',
    label: 'Vue 2 — vue2.vue',
    replaced: [
      'Loading your invoices...',
      'We could not load your invoices',
      'Your invoices are up to date.',
      'Filter invoices',
      'Open help center',
      'Billing overview',
    ],
    kept: [
      'class="billing-card"',
      'data-testid="billing-card"',
      ':href="helpLink"',
      'd="M4 9l3 3 6-6"',
      "this.$t('billing.section_title')",
      "console.log('debug only, console arguments are skipped')",
    ],
    existingKeys: ['billing.section_title'],
    expectedMessages: { 'app.invoice': 'Invoice {0}', 'app.amount_due_is_0': 'Amount due is {0}' },
  },
  {
    fileName: 'vue3.vue',
    label: 'Vue 3 — vue3.vue',
    replaced: [
      'We have ${members.value.length} active members',
      'Invite a teammate to get started',
      'Owners can transfer the workspace',
      'Loading members...',
      'Invite by email',
      'Send invite',
    ],
    kept: [
      'class="team-card"',
      'data-testid="team-card"',
      ':key="member.id"',
      'activeRole.value === ROLES[0]',
      "$t('team.card_title')",
    ],
    existingKeys: ['team.card_title'],
    expectedMessages: { 'app.role': 'Role {0}', 'app.we_have_0_active_members': 'We have {0} active members' },
  },
]
