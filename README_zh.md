# @discountry/clickup-cli

[English](./README.md)

用于任务、评论、文档的 ClickUp CLI。

## 安装

```bash
npm install -g @discountry/clickup-cli
clickup --help
```

安装 Codex skill：

```bash
npx skills add discountry/clickup-cli --skill clickup
# 或
npx skills add https://github.com/discountry/clickup-cli --skill clickup
```

Skill 文档：[skills/clickup/README.md](./skills/clickup/README.md)

本地安装当前仓库：

```bash
npm install -g .
```

## 配置

设置 shell 环境变量：

```bash
export CLICKUP_API_TOKEN=pk_your_token_here
export CLICKUP_WORKSPACE_ID=123456
export CLICKUP_USER_ID=7890
export CLICKUP_DEFAULT_LIST_ID=901111220963
```

变量说明：

- `CLICKUP_API_TOKEN`：必填。ClickUp Personal API Token。
- `CLICKUP_WORKSPACE_ID`：可选。Workspace ID。
- `CLICKUP_TEAM_ID`：可选。`CLICKUP_WORKSPACE_ID` 的别名。
- `CLICKUP_USER_ID`：可选。当前用户 ID。
- `CLICKUP_DEFAULT_LIST_ID`：可选。`clickup create "Task title"` 使用的默认 list。

## 命令

```bash
clickup me
clickup get 86a1b2c3d --subtasks
clickup comments 86a1b2c3d
clickup comment 86a1b2c3d "Starting work"
clickup status 86a1b2c3d "in progress"
clickup create "Quick task"
clickup create 901111220963 "New feature" --assignee me --due tomorrow --description "## Scope"
clickup my-tasks
clickup search "authentication"
clickup assign 86a1b2c3d jane
clickup due 86a1b2c3d "+3d"
clickup priority 86a1b2c3d high
clickup subtask 86a1b2c3d "Write tests"
clickup move 86a1b2c3d 901111220964
clickup link 86a1b2c3d "https://github.com/org/repo/pull/123" "PR #123"
clickup checklist 86a1b2c3d "Review code"
clickup delete-comment 90110200841741
clickup watch 86a1b2c3d alex
clickup tag 86a1b2c3d "DevOps"
clickup description 86a1b2c3d "# Summary"
clickup docs
clickup docs "API"
clickup docs "Sprint1" --parent-type FOLDER --limit 100
clickup doc abc123
clickup create-doc "Project Notes" --content "# Notes"
clickup page abc123 page456 --content-format text/plain
clickup create-page abc123 "New Section" --content "Hello" --sub-title "Summary"
clickup edit-page abc123 page456 --name "Renamed" --sub-title "Updated" --content "# Updated" --content-edit-mode append
```

需要原始 API 输出时加 `--json`。

文档和页面命令：

- `docs` 支持 `--id`、`--creator`、`--deleted`、`--archived`、`--parent-id`、`--parent-type`、`--limit`。
- `doc` 支持 `--max-page-depth`。
- `page` 支持 `--content-format text/md|text/plain`。
- `create-page` 支持 `--sub-title`、`--parent-page-id`、`--content-format`。
- `edit-page` 支持 `--name`、`--sub-title`、`--content`、`--content-edit-mode`、`--content-format`。

## 开发

```bash
pnpm install
pnpm test
npm run pack:check
```

目录：

- `bin/clickup.js`：CLI 入口。
- `src/cli/`：参数解析、命令注册、帮助信息。
- `src/services/`：任务、评论、文档、用户服务。
- `src/http/`：ClickUp HTTP 客户端。
- `src/utils/`：ID 解析、日期解析、Markdown 转换、输出格式化。
- `tests/`：自动化测试。
