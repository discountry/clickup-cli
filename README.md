# @discountry/clickup-cli

[中文说明](./README_zh.md)

Global ClickUp CLI for tasks, comments, and docs.

## Install

```bash
npm install -g @discountry/clickup-cli
clickup --help
```

Install the Codex skill:

```bash
npx skills add discountry/clickup-cli --skill clickup
# or
npx skills add https://github.com/discountry/clickup-cli --skill clickup
```

Skill docs: [skills/clickup/README.md](./skills/clickup/README.md)

Local package install:

```bash
npm install -g .
```

## Configure

Set shell environment variables:

```bash
export CLICKUP_API_TOKEN=pk_your_token_here
export CLICKUP_WORKSPACE_ID=123456
export CLICKUP_USER_ID=7890
export CLICKUP_DEFAULT_LIST_ID=901111220963
```

Variables:

- `CLICKUP_API_TOKEN`: required. ClickUp Personal API Token.
- `CLICKUP_WORKSPACE_ID`: optional. Workspace ID.
- `CLICKUP_TEAM_ID`: optional. Alias for `CLICKUP_WORKSPACE_ID`.
- `CLICKUP_USER_ID`: optional. Current user ID.
- `CLICKUP_DEFAULT_LIST_ID`: optional. Default list for `clickup create "Task title"`.

## Commands

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

Add `--json` for raw API output.

Docs and pages:

- `docs` supports `--id`, `--creator`, `--deleted`, `--archived`, `--parent-id`, `--parent-type`, `--limit`.
- `doc` supports `--max-page-depth`.
- `page` supports `--content-format text/md|text/plain`.
- `create-page` supports `--sub-title`, `--parent-page-id`, `--content-format`.
- `edit-page` supports `--name`, `--sub-title`, `--content`, `--content-edit-mode`, `--content-format`.

## Development

```bash
pnpm install
pnpm test
npm run pack:check
```

Paths:

- `bin/clickup.js`: CLI entry.
- `src/cli/`: argument parsing, command registration, help text.
- `src/services/`: task, comment, doc, and user services.
- `src/http/`: ClickUp HTTP client.
- `src/utils/`: ID parsing, date parsing, Markdown conversion, output formatting.
- `tests/`: automated tests.
