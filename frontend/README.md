# React + TypeScript + Vite

本项目提供一个基于 React + Monaco Editor 的 Web 可视化界面：

```bash
cd frontend
bun install
bun run dev
```

功能：
- 实时代码编辑与预览
- 支持多种文件类型切换
- 配置 Key Prefix 和 $t Prefix
- 分屏展示：替换后代码 / 提取的 JSON / 警告信息 / 已有 Key
- 目录扫描：批量提取并保真写盘、合并语言包
- 中英双语界面：按浏览器语言自动命中，右上角可手动切换

## 示例

「示例」下拉框的 6 个文件来自仓库根目录 `test/demo/`，覆盖 Vue 2/3、JS/TS、JSX/TSX 的典型写法（属性、模板字符串插值、数字变体合并、配置键与代码串跳过、已有 `t()` 复用）。同一批文件也是 CLI 的测试夹具，断言在 `test/demo-manifest.ts`，改动示例时请同步。

## i18n

界面文案全部走 `t('app.…')`，语言包：`src/i18n/locales/en.json`、`zh-CN.json`。

```bash
# 仓库根目录：扫描本前端并把 t() 写回源码、同步英文语言包
bun run i18n:frontend
# 校验源码 key 与语言包一致（应为 0 missing / 0 orphan）
bun run i18n:check
```

不翻译的内容：产品名 `AST I18n Extractor`、`GitHub`、语言名（`English` / `简体中文`）、`demo/` 下的示例代码。
