# AST i18n Extractor

基于 AST (抽象语法树) 的自动化国际化 (i18n) 提取工具，自动识别 Vue、JavaScript、TypeScript 和 JSX/TSX 文件中的中文文案，提取为 i18n 键值对并替换源代码。

## 功能特性

- **多文件支持**: Vue 2/3、JavaScript、TypeScript、JSX/TSX
- **AST 解析**: 使用 `acorn` 和 Vue 编译器解析代码
- **智能识别**: 自动识别中文文案，排除 URL、变量名等无需翻译内容
- **自动替换**: 将源码替换为 i18n 调用形式 (如 `t('key')`)
- **Key 生成**: 中文转拼音 + snake_case，自动去重

## 项目结构

```
ast-i18n-extractor/
├── src/                  # 核心提取库
│   ├── extractors/       # 各类文件提取器
│   ├── checker.ts        # 文案校验器
│   ├── replacer.ts       # 代码替换器
│   └── index.ts          # 导出入口
├── frontend/             # Web 可视化界面
│   ├── src/
│   │   └── App.tsx       # 主应用组件
│   └── package.json
└── test/                 # 测试用例
```

## Web 界面

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
- 分屏展示：替换后代码 / 提取的 JSON / 警告信息

## GitHub Pages 自动部署

项目配置了 GitHub Actions 自动部署流程，推送到 `master` 分支时会自动构建并部署到 GitHub Pages。

**启用步骤：**

1. 进入仓库的 **Settings** → **Pages**
2. 在 **Source** 中选择 **GitHub Actions**
3. 保存设置后，推送到 `master` 分支即可自动部署

**手动触发部署：**

进入仓库的 **Actions** → **Deploy to GitHub Pages** → **Run workflow**

**访问地址：**

```
https://<username>.github.io/ast-i18n-extractor/
```

## 快速开始 (API)

```typescript
import { extractJs, extractJsx, extractVue } from 'ast-i18n-extractor'

// 提取 Vue 文件
const result = await extractVue(sourceCode, 'page.home')

// 提取 JS/TS
const result = await extractJs(sourceCode, 'page.home', 'ts')

// 提取 JSX/TSX
const result = await extractJsx(sourceCode, 'page.home')

// 结果
result.output // 替换后的代码
result.extracted // 提取的语言包 { key: value }
result.warnings // 警告信息（如模板字符串）
```

## 开发

```bash
# 安装依赖
bun install

# 运行测试
bun run test

# 构建库
bun run build

# 启动前端开发服务器
cd frontend && bun run dev
```

## 许可

MIT
