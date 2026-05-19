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
