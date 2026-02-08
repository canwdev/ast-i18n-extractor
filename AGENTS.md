# Agent 行为准则

1.  **项目认知**: 开始任务前，必须阅读 `README.md` 理解项目架构和原理。
2.  **工具链**: 必须统一使用 `bun` 进行依赖安装、脚本运行和测试。
3.  **类型规范**: 严禁使用 `any`。必须使用具体类型或 `unknown` 配合收窄。
4.  **验证流程**: 修改代码后，必须执行并通过以下检查：
    *   `bun run type-check` (无 TS 错误)
    *   `bun run lint:fix` (无 Lint 错误)
5.  **操作系统平台特性**: 执行命令前，根据目标平台（如 Windows、macOS、Linux）调整命令，例如 Windows 不要使用 `command1 && command2`。
6.  **前端项目**：本项目提供一个基于 React + Monaco Editor 的 Web 可视化界面，在 frontend 目录下。
