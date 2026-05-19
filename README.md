# AST i18n Extractor

基于 AST 的 i18n 文案提取：支持 Vue 2/3、JS/TS、JSX/TSX；识别可翻译字符串，替换为 `$t` / `this.$t` / `t(...)`，生成 key-value 语言包（中文 key 转拼音 snake_case，自动去重）。

## 使用

```typescript
import { extractJs, extractJsx, extractVue } from 'ast-i18n-extractor'

const { output, extracted, warnings } = await extractVue(source, 'page.home')
// output: 替换后源码 | extracted: 语言包 | warnings: 需人工处理的项
```

```typescript
// 可选：自定义跳过的日志对象
await extractJs(src, 'app', 'ts', '$t', undefined, {
  logObjects: ['console', 'logger'],
})
```

## Web 界面

`frontend/` — React + Monaco，单文件提取与目录扫描。本地：`cd frontend && bun install && bun run dev`。

在线演示：推送到 `master` 后由 GitHub Actions 部署 Pages（Settings → Pages → GitHub Actions）。地址：`https://<username>.github.io/ast-i18n-extractor/`

## 开发

```bash
bun install
bun run test
bun run build
```

贡献者与 Agent 见 [AGENTS.md](./AGENTS.md)。

## License

MIT
