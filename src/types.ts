export interface WarningItem {
  message: string
  value: string
  key?: string
  exps?: string[]
}

/** 提取选项 */
export interface ExtractOptions {
  /** 日志成员调用的对象名，如 console、logger；默认 ['console', 'logger'] */
  logObjects?: string[]
}

/** 一次提取的结果：key + 写进语言包的文案（数字变体会改写为 {0} 模板）+ 调用点参数 */
export interface GeneratedEntry {
  key: string
  text?: string
  params?: string[]
}

export type GenerateEntry = (value: string) => GeneratedEntry

/** 提取器配置 */
export interface ExtractorOptions {
  /** 值级忽略规则（按项目传入品牌名/产品名等，工具本身不内置任何品牌） */
  ignoreValuePatterns?: RegExp[]
}
