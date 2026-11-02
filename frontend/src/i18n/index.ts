import { useSyncExternalStore } from 'react'

import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

/** 语言包是嵌套结构：{ app: { key: 'value' } } */
interface MessageTree { [key: string]: string | MessageTree }

export type Locale = 'en' | 'zh-CN'

export interface LocaleOption {
  id: Locale
  /** 语言名使用母语写法，切换时无需二次翻译 */
  label: string
}

export const LOCALES: readonly LocaleOption[] = [
  { id: 'en', label: 'English' },
  { id: 'zh-CN', label: '简体中文' },
]

export const DEFAULT_LOCALE: Locale = 'en'

const STORAGE_KEY = 'ast-i18n-locale'

const DICTIONARIES: Record<Locale, MessageTree> = {
  'en': en,
  'zh-CN': zhCN,
}

const listeners = new Set<() => void>()

function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'zh-CN'
}

const PLACEHOLDER_RE = /\{(\d+)\}/g

/** 浏览器语言 → 支持的语言；`zh` 系列（含 zh-TW/HK）统一落到简体中文 */
function matchLocale(language: string | undefined): Locale | undefined {
  const tag = language?.toLowerCase()
  if (tag === undefined || tag === '')
    return undefined
  if (tag.startsWith('zh'))
    return 'zh-CN'
  if (tag.startsWith('en'))
    return 'en'
  return undefined
}

function readStoredLocale(): Locale | undefined {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : undefined
  }
  catch {
    return undefined
  }
}

/** 记忆优先级：本地选择 > 浏览器语言 > 默认英文 */
export function detectLocale(): Locale {
  const stored = readStoredLocale()
  if (stored)
    return stored

  const candidates = typeof navigator === 'undefined'
    ? []
    : [...(navigator.languages ?? []), navigator.language]
  for (const candidate of candidates) {
    const matched = matchLocale(candidate)
    if (matched)
      return matched
  }
  return DEFAULT_LOCALE
}

let currentLocale: Locale = detectLocale()

export function getLocale(): Locale {
  return currentLocale
}

function syncDocumentLang() {
  if (typeof document !== 'undefined')
    document.documentElement.lang = currentLocale
}

export function setLocale(locale: Locale) {
  if (locale === currentLocale)
    return
  currentLocale = locale
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  }
  catch {
    // 隐私模式下 localStorage 不可用，仅本次会话生效
  }
  syncDocumentLang()
  listeners.forEach(listener => listener())
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function lookup(tree: MessageTree | undefined, key: string): string | undefined {
  let node: string | MessageTree | undefined = tree
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null)
      return undefined
    node = node[segment]
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * 取文案。缺失时回落到默认语言，再回落到 key 本身，避免界面出现空白。
 * `{0}` / `{1}` 按 params 顺序插值。
 */
export function t(key: string, params?: readonly (string | number)[]): string {
  const message = lookup(DICTIONARIES[currentLocale], key)
    ?? lookup(DICTIONARIES[DEFAULT_LOCALE], key)
    ?? key

  if (params === undefined || params.length === 0)
    return message

  return message.replace(PLACEHOLDER_RE, (matched, index: string) => {
    const value = params[Number(index)]
    return value === undefined ? matched : String(value)
  })
}

/** 组件内订阅语言变化；切换后整棵树重新渲染 */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE)
}

syncDocumentLang()
