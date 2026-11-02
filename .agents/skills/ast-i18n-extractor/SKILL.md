---
name: ast-i18n-extractor
description: Run the ast-i18n-extractor CLI and reference its parameters and post-processing rules. Trigger when extracting i18n strings from Vue/JS/TS/JSX/TSX with bun, or when adding or changing CLI flags, defaults, outputs, help text, or extraction rules.
---

# AST i18n Extractor CLI

## 唯一真相

CLI 参数、默认值与输出语义以本文件为准，实现见 `src/cli/args.ts`、`src/cli/run.ts`、`src/checker.ts`、`src/utils/code-detect.ts`。修改参数或提取规则必须同步本文件与测试。

开发流程、仓库结构见 `AGENTS.md`；库 API 见 `README.md`。**工具本身保持品牌/项目无关**：不得把某公司的品牌名、产品名、技术规格或业务配置写进源码默认规则；项目侧品牌/术语词库放消费方仓库（如 `.agents/skills/<skill>/i18n-terms.md`），通过 `--ignore-value` 传入或抽取后处理。

## 运行

```bash
bun install
bun src/cli.ts <文件或目录...> [options]
bun run cli -- <文件或目录...> [options]   # 等价，走 package script
bun src/cli.ts --help
```

支持 `.vue`、`.js`、`.ts`、`.jsx`、`.tsx`。默认 dry-run，只报告不写盘。

## 参数

| 参数 | 说明 |
| --- | --- |
| `-p, --prefix <prefix>` | key 前缀，默认 `app`；传空字符串关闭前缀 |
| `-t, --t-prefix <prefix>` | 替换函数前缀；默认 JS 为 `this.$t`、TS 为 `$t`、JSX/TSX 为 `t` |
| `-w, --write` | 原地写回被修改的源文件 |
| `-l, --lang <file>` | 将提取结果深度合并进 JSON 语言包（新值覆盖旧值） |
| `--warnings <file>` | 输出 warnings JSON（数组，每项含 `file`） |
| `--existing-keys <file>` | 输出源码中已有的 `$t()` / `t()` key（排序去重数组） |
| `--report <file>` | 输出 JSON 报告：`totals` / `files` / `keys` / `variants` / `warnings` |
| `--check <lang.json>` | 校验源码已有 `$t()` key 与语言包：缺 key / 孤儿 key 时退出码 1 |
| `--no-numeric-merge` | 关闭数字变体合并（默认开启，见下） |
| `--ignore-value <regex>` | 跳过命中正则的**文案值**；可重复或逗号分隔。品牌名/产品名等按项目传入 |
| `--ignore <regex>` | 跳过匹配的**文件路径**，可重复或逗号分隔 |
| `--no-default-ignore` | 关闭默认忽略 |
| `-q, --quiet` | 只输出最终摘要 |
| `-h, --help` | 显示帮助 |
| `-v, --version` | 显示版本 |

默认忽略：`node_modules`、`dist`、`.git`、`*.test.*`、`*.spec.*`。显式传入的文件命中忽略规则时也会跳过。

## 写盘与输出

- **保真写盘**：只替换 script / template 块内被抽中的文本区间，块标签、属性、block 顺序、空行、缩进、行尾（CRLF/LF）与文件末尾换行全部保持原样；无文案的文件不会被重排或写盘。
- **数字变体自动合并**：同一批输入里只有末尾整数不同的文案（`Step 1/2/3`、`Option 1/2/3`、`3 Items/2 Items`）合并成一个 key：
  - 语言包值写 `{0}` 模板（`"Step {0}"`、`"{0} Items"`）；
  - 调用点自动带参数（`$t('ns.step', [2])`）。
  - 数字必须是独立 token（`Step 1` 会合并，`v2.0` / `A.1` 不会）；至少出现 2 个不同数字才合并。
  - 实现为先扫一遍收值、再预置模板重扫；`--no-numeric-merge` 可关闭。
- **纯技术用语默认不抽**：带数字/大写代号且没有自然语言单词的值直接写死，如 `1234x567`、`ABC-123`、`1.5 kg`、`$9.99`。
- **代码位置默认不抽**：`String.replace/replaceAll` 的替换串、`error()` / `createError()` 参数、`new Error()`、GLSL/shader 源码、对象里的 `name` / `id` / `key` / `class` / `src` / `href` / `type` 等配置键（组件名、锚点 id、图片地址）。
- `--lang` 目标 JSON 不存在时创建；存在时读取并深度合并。
- `--lang` 目标 JSON 非法或不是对象时报错退出，不覆盖用户文件。
- 未指定 `--lang` / `--warnings` / `--existing-keys` / `--report` 时不产生对应输出。

## 退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | 成功（允许存在 warnings） |
| `1` | 文件读取/解析错误、无匹配文件、语言包 JSON 非法、`--check` 发现缺失/孤儿 key |
| `2` | 参数错误 |

## 示例

```bash
# 预览
bun src/cli.ts src --prefix app

# 原地替换并合并语言包
bun src/cli.ts src --prefix app --write --lang locales/zh-CN.json

# 自定义替换函数并导出告警
bun src/cli.ts src/App.vue --prefix app --t-prefix '$t' --warnings out/warnings.json

# 页面级抽取：显式列文件挡掉 shader 等噪声；品牌/产品名按项目传 --ignore-value
find components/Products/MyPage -type f \( -name '*.vue' -o -name '*.js' \) \
  | grep -v 'MyPage.gl.js' \
  | xargs bun src/cli.ts --prefix my_page \
      --ignore-value '^Vendor (One|Two)$' --ignore-value '^Product 2$' \
      --write --lang locales/en-US.json --report out/i18n-report.json

# CI：校验源码 $t key 与语言包一致
bun src/cli.ts components/Products/MyPage --prefix my_page \
  --check locales/en-US.json
```

## 抽取后处理（Agent 必做）

工具已处理「排版保真、数字变体、通用技术用语、常见代码位置」，Agent 只需处理项目语义。写盘后按下面清单过一遍再提交。

### 1. 数字变体：确认是插值，不要拆 key

- 工具会自动生成 `key` + `{0}` 模板 + 调用参数，检查 JSON 里没有 `night_scene_1/2/3`、`custom_lut_1/2/3`、`n_5_ports` 这类残留。
- 手工补抽或改写时同样用 `{0}` + `$t(key, [n])`，不要新增数字后缀 key。

### 2. 纯技术用语：工具漏网的按项目口径写死

- 工具只跳过「完全没有自然语言单词」的值；含单词但实际仍是规格枚举的（如 `Slot 1, Slot 2, Slot 3`）会被抽出。
- 这类值直接写死，并从语言包删掉 key；想从源头避免，用 `--ignore-value` 传入项目正则。
- 同一页面内单位/记号保持统一（按项目词库的口径，不要混用多种写法）。

### 3. 品牌名 / 产品名：不翻译、不写入工具库

- 产品名、App 名、第三方品牌名（如 `Vendor One`、`Vendor Two`、`Product 2`、`Vendor Deck`）一律写死，不建语言的 key。
- **禁止把这些词表写进工具的默认规则/源码**；需要源头过滤时，在项目侧传 `--ignore-value '^Vendor '` 一类的正则。
- 描述性文案（`Manage camera settings...`）仍然抽取，只有名字本身写死。

### 4. 剔除代码串 / 非文案

- 工具已跳过：`replace` 第二参数、`error()/createError`、GLSL、组件 `name` / 配置键、数字/URL/颜色/UUID 等。
- 仍需人工留意：价格与营销贴纸（`$9.99`、`24%!`）、框架内部错误串、动态拼接文案；抽到就回退该 key 与调用点。
- 整份文件都是噪声时（shader、生成代码），在调用时排除该文件，不要靠写盘后回退。

### 5. 全局 key 复用与文案一致

- 值与 `common.*` 完全一致时直接复用（如 `Watch Video` → `common.watch_video`）。
- 大小写 / 标点不同（`Learn More` vs `Learn more`）以设计稿为准，不要为了复用改文案。

### 6. 提交前校验

- 跑 `--check <lang.json>`：源码已有 `$t` key 与语言包必须 **0 missing / 0 orphan**。
- 跑项目 lint（ESLint + Prettier），处理长行 / 属性换行。
- 只提交目标页面目录 + 目标语言包 + 本次用到的 `--ignore-value` 说明；临时报告、其他产品改动不要带进提交。
