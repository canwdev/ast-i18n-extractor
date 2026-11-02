import type { FileType } from '../utils/file-type'
import type { ParsedIgnorePatterns } from '../utils/ignore'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { getFileType } from '../utils/file-type'
import { parseIgnorePatterns, shouldIgnoreFile } from '../utils/ignore'

export const DEFAULT_IGNORE_SOURCES = [
  String.raw`(^|/)node_modules(/|$)`,
  String.raw`(^|/)dist(/|$)`,
  String.raw`(^|/)\.git(/|$)`,
  String.raw`\.test\.`,
  String.raw`\.spec\.`,
]

export const DEFAULT_IGNORE_DESCRIPTION = 'node_modules, dist, .git, *.test.*, *.spec.*'

export interface DiscoveredFile {
  absolutePath: string
  displayPath: string
  fileType: FileType
}

export interface DiscoverResult {
  files: DiscoveredFile[]
  errors: string[]
}

export function buildIgnorePatterns(custom: string[], useDefaults: boolean): ParsedIgnorePatterns {
  const sources = [...(useDefaults ? DEFAULT_IGNORE_SOURCES : []), ...custom]
  return parseIgnorePatterns(sources.join(','))
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

export function discoverFiles(inputs: string[], patterns: readonly RegExp[]): DiscoverResult {
  const cwd = process.cwd()
  const files = new Map<string, DiscoveredFile>()
  const errors: string[] = []

  const walk = (absolutePath: string) => {
    const displayPath = normalizePath(path.relative(cwd, absolutePath) || '.')

    let stat: fs.Stats
    try {
      stat = fs.statSync(absolutePath)
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${displayPath}: ${message}`)
      return
    }

    if (stat.isDirectory()) {
      if (shouldIgnoreFile(`${displayPath}/`, patterns))
        return

      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(absolutePath, { withFileTypes: true })
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${displayPath}: ${message}`)
        return
      }

      entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((entry) => {
          if (entry.isSymbolicLink())
            return
          walk(path.join(absolutePath, entry.name))
        })
      return
    }

    if (!stat.isFile() || shouldIgnoreFile(displayPath, patterns))
      return

    const fileType = getFileType(displayPath)
    if (!fileType || files.has(absolutePath))
      return

    files.set(absolutePath, { absolutePath, displayPath, fileType })
  }

  inputs.forEach(input => walk(path.resolve(cwd, input)))

  return {
    files: [...files.values()].sort((a, b) => a.displayPath.localeCompare(b.displayPath)),
    errors,
  }
}
