// TS 示例：组合式写法，覆盖类型标注、枚举、as const、数字变体合并、模板字符串、已有 $t 复用
interface FeatureRow {
  label: string
  value: string
}

// 枚举值是代码标识（free / team / enterprise），不是界面文案
enum Plan {
  Free = 'free',
  Team = 'team',
  Enterprise = 'enterprise',
}

// 末尾数字不同的文案合并为 `{0}` 占位符，调用点自动带参数
const PLAN_LABELS = ['Free plan', 'Team plan', 'Enterprise plan'] as const

const rows = ref<FeatureRow[]>([
  { label: 'Compression Option', value: 'Full' },
  { label: 'Video Quality', value: 'Highest' },
])

const selectedPlan = ref<Plan>(Plan.Team)

// 模板字符串里的插值会转成 {0} / {1}
const summary = computed(() => `We compared ${rows.value.length} features`)

const remainingSeats = computed(() => `Only ${seatCount.value} seats left`)

const emptyHint = computed(() => 'Pick a plan to see the details')

// 纯技术用语（型号 / 分辨率 / 价格）没有自然语言单词，默认写死不抽取
const deviceTag = 'ABC-123'
const pixelSize = '1234x567'
const unitPrice = '$9.99'

function describePlan(plan: Plan): string {
  return plan === Plan.Enterprise
    ? 'Built for large teams'
    : 'Great for small teams'
}

function loadRows(source: string[], endpoint: string) {
  // String.replace 的替换串不抽取
  const path = endpoint.replace('/v1', '/v2')
  // console 参数属于调试信息，不抽取
  console.log('debug only, console arguments are skipped')
  return rows.value.concat(source.map(label => ({ label, value: path })))
}

function validate() {
  if (!rows.value.length) {
    // new Error 的参数不抽取
    throw new Error('Nothing to compare')
  }
  // 已有 $t 调用不重复生成 key
  return $t('compare.validation_passed')
}
