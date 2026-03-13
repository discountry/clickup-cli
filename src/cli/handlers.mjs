import { CliUsageError } from '../errors.mjs';
import {
  formatComments,
  formatDoc,
  formatDocList,
  formatPage,
  formatPageList,
  formatTask,
  formatTaskList,
  formatUser,
} from '../utils/formatters.mjs';
import {
  parseDocId,
  parseListId,
  parsePageId,
  parseTaskId,
} from '../utils/id-parsers.mjs';

function requireArg(value, message, usage) {
  if (!value) {
    throw new CliUsageError(message, usage);
  }
}

function ensureArgRange(args, { min = 0, max = Infinity }, usage) {
  if (args.length < min) {
    throw new CliUsageError('Missing required arguments.', usage);
  }
  if (args.length > max) {
    throw new CliUsageError('Too many arguments.', usage);
  }
}

function formatResult(json, text) {
  return { json, text };
}

function createdTaskText(task) {
  const lines = [`Task created: ${task.name}`, `ID: ${task.id}`];
  if (task.assignees?.length > 0) {
    lines.push(
      `Assignees: ${task.assignees.map((assignee) => assignee.username || assignee.email).join(', ')}`
    );
  }
  if (task.due_date) {
    lines.push(`Due: ${new Date(Number(task.due_date)).toLocaleDateString('en-US')}`);
  }
  if (task.url) {
    lines.push(`URL: ${task.url}`);
  }
  return lines.join('\n');
}

export function createHandlers(getApp) {
  return {
    async me({ args }) {
      ensureArgRange(args, { max: 0 }, 'me');
      const app = getApp();
      const user = await app.userService.getCurrentUser();
      return formatResult(user, formatUser(user));
    },

    async 'my-tasks'({ args }) {
      ensureArgRange(args, { max: 0 }, 'my-tasks');
      const app = getApp();
      const tasks = await app.taskService.getMyTasks();
      return formatResult(tasks, formatTaskList(tasks));
    },

    async search({ args }) {
      ensureArgRange(args, { min: 1, max: 1 }, 'search "query"');
      const [query] = args;
      const app = getApp();
      const tasks = await app.taskService.searchTasks(query);
      const text =
        tasks.length === 0
          ? `No tasks found matching "${query}".`
          : formatTaskList(tasks);
      return formatResult(tasks, text);
    },

    async docs({ args, options }) {
      ensureArgRange(args, { max: 1 }, 'docs ["query"]');
      const [query] = args;
      const app = getApp();
      const docs = await app.docService.searchDocs({
        ...(query ? { query } : {}),
        ...(options.id !== null ? { id: options.id } : {}),
        ...(options.creator !== null ? { creator: options.creator } : {}),
        ...(options.deleted ? { deleted: true } : {}),
        ...(options.archived ? { archived: true } : {}),
        ...(options.parentId !== null ? { parentId: options.parentId } : {}),
        ...(options.parentType !== null ? { parentType: options.parentType } : {}),
        ...(options.limit !== null ? { limit: options.limit } : {}),
      });
      const text =
        docs.length === 0
          ? query
            ? `No docs found matching "${query}".`
            : 'No docs found.'
          : formatDocList(docs);
      return formatResult(docs, text);
    },

    async 'create-doc'({ args, options }) {
      ensureArgRange(args, { min: 1, max: 1 }, 'create-doc "Doc Title" [--content "content"]');
      const [title] = args;
      const app = getApp();
      const doc = await app.docService.createDoc(title, {
        content: options.content ?? undefined,
      });
      const textLines = [`Doc created: ${doc.name}`, `ID: ${doc.id}`];
      if (doc.firstPageId) {
        textLines.push('First page populated with content.');
      }
      return formatResult(doc, textLines.join('\n'));
    },

    async get({ args, options }) {
      ensureArgRange(args, { min: 1, max: 1 }, 'get <url|id>');
      const taskId = parseTaskId(args[0]);
      requireArg(taskId, 'Could not parse task ID from input.', 'get <url|id>');
      const app = getApp();
      const task = await app.taskService.getTask(taskId, {
        includeSubtasks: options.subtasks,
      });
      return formatResult(task, formatTask(task));
    },

    async comments({ args }) {
      ensureArgRange(args, { min: 1, max: 1 }, 'comments <url|id>');
      const taskId = parseTaskId(args[0]);
      requireArg(taskId, 'Could not parse task ID from input.', 'comments <url|id>');
      const app = getApp();
      const comments = await app.commentService.getComments(taskId);
      return formatResult(comments, formatComments(comments));
    },

    async comment({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'comment <url|id> "message"');
      const taskId = parseTaskId(args[0]);
      const message = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'comment <url|id> "message"');
      requireArg(message, 'Comment text required.', 'comment <url|id> "message"');
      const app = getApp();
      const result = await app.commentService.postComment(taskId, message);
      return formatResult(result, `Comment posted successfully (ID: ${result.id})`);
    },

    async status({ args, options }) {
      ensureArgRange(args, { min: 1, max: 2 }, 'status <url|id> [status]');
      const taskId = parseTaskId(args[0]);
      const statusInput = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'status <url|id> [status]');
      const app = getApp();

      if (!statusInput) {
        const statuses = await app.taskService.getAvailableStatuses(taskId);
        const text = ['Available statuses:']
          .concat(statuses.map((status) => `  - "${status.status}" (${status.type})`))
          .join('\n');
        return formatResult(statuses, text);
      }

      const result = await app.taskService.updateTaskStatus(taskId, statusInput);
      const text = `Status updated to "${result.matchedStatus.status}"`;
      return formatResult(options.json ? result.task : result.task, text);
    },

    async tasks({ args, options }) {
      ensureArgRange(args, { min: 1, max: 1 }, 'tasks <list_id>');
      const listId = parseListId(args[0]);
      requireArg(listId, 'Could not parse list ID from input.', 'tasks <list_id>');
      const app = getApp();
      const assigneeId = options.me ? await app.userService.getCurrentUserId() : null;
      const tasks = await app.taskService.getTasksInList(listId, { assigneeId });
      return formatResult(tasks, formatTaskList(tasks));
    },

    async create({ args, options }) {
      ensureArgRange(args, { min: 1, max: 2 }, 'create [list_id] "Task title"');
      const [firstArg, secondArg] = args;
      requireArg(firstArg, 'Task title required.', 'create [list_id] "Task title"');

      const explicitListId = parseListId(firstArg);
      const title = explicitListId ? secondArg : firstArg;
      requireArg(title, 'Task title required.', 'create [list_id] "Task title"');
      const app = getApp();

      const { listId, payload } = await app.taskService.buildCreateTaskPayload({
        listId: explicitListId,
        title,
        description: options.description,
        due: options.due,
        assignee: options.assignee,
      });
      const task = await app.taskService.createTask(listId, title, payload);
      return formatResult(task, createdTaskText(task));
    },

    async assign({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'assign <task> <user>');
      const taskId = parseTaskId(args[0]);
      const userQuery = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'assign <task> <user>');
      requireArg(userQuery, 'User required.', 'assign <task> <user>');
      const app = getApp();
      const assigneeId = await app.taskService.resolveAssigneeId(userQuery);
      const task = await app.taskService.assignTask(taskId, [assigneeId]);
      return formatResult(task, `Task assigned to ${userQuery}`);
    },

    async due({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'due <task> "date"');
      const taskId = parseTaskId(args[0]);
      const dueInput = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'due <task> "date"');
      requireArg(dueInput, 'Due date required.', 'due <task> "date"');
      const app = getApp();
      const task = await app.taskService.setDueDate(taskId, dueInput);
      const dueDate = task.due_date
        ? new Date(Number(task.due_date)).toLocaleDateString('en-US')
        : 'cleared';
      return formatResult(task, `Due date set to: ${dueDate}`);
    },

    async priority({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'priority <task> <level>');
      const taskId = parseTaskId(args[0]);
      const level = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'priority <task> <level>');
      requireArg(level, 'Priority level required.', 'priority <task> <level>');
      const app = getApp();
      const result = await app.taskService.setPriority(taskId, level);
      return formatResult(result.task, `Priority set to: ${result.priority}`);
    },

    async subtask({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'subtask <task> "title"');
      const taskId = parseTaskId(args[0]);
      const title = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'subtask <task> "title"');
      requireArg(title, 'Subtask title required.', 'subtask <task> "title"');
      const app = getApp();
      const task = await app.taskService.createSubtask(taskId, title);
      return formatResult(task, `Subtask created: ${task.name}\nID: ${task.id}\nURL: ${task.url}`);
    },

    async move({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'move <task> <list_id>');
      const taskId = parseTaskId(args[0]);
      const targetListId = parseListId(args[1]);
      requireArg(taskId, 'Could not parse task ID from input.', 'move <task> <list_id>');
      requireArg(targetListId, 'Target list ID required.', 'move <task> <list_id>');
      const app = getApp();
      const task = await app.taskService.moveTask(taskId, targetListId);
      const lines = ['Task moved successfully'];
      if (task.url) {
        lines.push(`URL: ${task.url}`);
      }
      return formatResult(task, lines.join('\n'));
    },

    async link({ args }) {
      ensureArgRange(args, { min: 2, max: 3 }, 'link <task> <url> ["description"]');
      const taskId = parseTaskId(args[0]);
      const url = args[1];
      const description = args[2] ?? null;
      requireArg(taskId, 'Could not parse task ID from input.', 'link <task> <url> ["description"]');
      requireArg(url, 'URL required.', 'link <task> <url> ["description"]');
      const app = getApp();
      const result = await app.taskService.addExternalLink(taskId, url, description);
      return formatResult(result, `Link added as comment (ID: ${result.id})`);
    },

    async checklist({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'checklist <task> "item"');
      const taskId = parseTaskId(args[0]);
      const item = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'checklist <task> "item"');
      requireArg(item, 'Checklist item required.', 'checklist <task> "item"');
      const app = getApp();
      const result = await app.taskService.addChecklistItemToTask(taskId, item);
      return formatResult(result, `Added to checklist "${result.checklist.name}"`);
    },

    async 'delete-comment'({ args }) {
      ensureArgRange(args, { min: 1, max: 1 }, 'delete-comment <comment_id>');
      const commentId = args[0];
      requireArg(commentId, 'Comment ID required.', 'delete-comment <comment_id>');
      const app = getApp();
      await app.commentService.deleteComment(commentId);
      return formatResult({ deleted: true, commentId }, `Comment ${commentId} deleted`);
    },

    async watch({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'watch <task> <user>');
      const taskId = parseTaskId(args[0]);
      const userQuery = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'watch <task> <user>');
      requireArg(userQuery, 'User required.', 'watch <task> <user>');
      const app = getApp();
      const result = await app.taskService.addWatcher(taskId, userQuery);
      const userLabel = result.user.username || result.user.email || result.user.id;
      return formatResult(
        {
          notified: true,
          user: userLabel,
          commentId: result.result.id,
          mode: result.mode,
        },
        `Notified ${userLabel} via @mention comment\n(Note: ClickUp API does not support adding watchers directly)`
      );
    },

    async tag({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'tag <task> "tag_name"');
      const taskId = parseTaskId(args[0]);
      const tagName = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'tag <task> "tag_name"');
      requireArg(tagName, 'Tag name required.', 'tag <task> "tag_name"');
      const app = getApp();
      await app.taskService.addTag(taskId, tagName);
      return formatResult({ tagged: true, taskId, tag: tagName }, `Tag "${tagName}" added to task`);
    },

    async description({ args }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'description <task> "text"');
      const taskId = parseTaskId(args[0]);
      const text = args[1];
      requireArg(taskId, 'Could not parse task ID from input.', 'description <task> "text"');
      requireArg(text, 'Description text required.', 'description <task> "text"');
      const app = getApp();
      const task = await app.taskService.updateDescription(taskId, text);
      return formatResult(task, `Task description updated\nURL: ${task.url}`);
    },

    async doc({ args, options }) {
      ensureArgRange(args, { min: 1, max: 1 }, 'doc <doc_id>');
      const docId = parseDocId(args[0]);
      requireArg(docId, 'Could not parse doc ID from input.', 'doc <doc_id>');
      const app = getApp();
      const [doc, pages] = await Promise.all([
        app.docService.getDoc(docId),
        app.docService.getDocPageListing(docId, {
          ...(options.maxPageDepth !== null ? { maxPageDepth: options.maxPageDepth } : {}),
        }),
      ]);
      return formatResult(
        { doc, pages },
        `${formatDoc(doc)}\n\nPages:\n${formatPageList(pages)}`
      );
    },

    async page({ args, options }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'page <doc_id> <page_id>');
      const docId = parseDocId(args[0]);
      const pageId = parsePageId(args[1]);
      requireArg(docId, 'Could not parse doc ID from input.', 'page <doc_id> <page_id>');
      requireArg(pageId, 'Page ID required.', 'page <doc_id> <page_id>');
      const app = getApp();
      const page = await app.docService.getPage(docId, pageId, options.contentFormat ?? 'text/md');
      return formatResult(page, formatPage(page));
    },

    async 'create-page'({ args, options }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'create-page <doc_id> "title"');
      const docId = parseDocId(args[0]);
      const title = args[1];
      requireArg(docId, 'Could not parse doc ID from input.', 'create-page <doc_id> "title"');
      requireArg(title, 'Page title required.', 'create-page <doc_id> "title"');
      const app = getApp();
      const page = await app.docService.createPage(docId, title, {
        content: options.content ?? undefined,
        contentFormat: options.contentFormat ?? undefined,
        parentPageId: options.parentPageId ?? undefined,
        subTitle: options.subTitle ?? undefined,
      });
      return formatResult(page, `Page created: ${page.name}\nID: ${page.id}`);
    },

    async 'edit-page'({ args, options }) {
      ensureArgRange(args, { min: 2, max: 2 }, 'edit-page <doc_id> <page_id>');
      const docId = parseDocId(args[0]);
      const pageId = parsePageId(args[1]);
      requireArg(docId, 'Could not parse doc ID from input.', 'edit-page <doc_id> <page_id>');
      requireArg(pageId, 'Page ID required.', 'edit-page <doc_id> <page_id>');
      if (options.content === null && options.name === null && options.subTitle === null) {
        throw new CliUsageError(
          'At least --content, --name, or --sub-title is required.',
          'edit-page <doc_id> <page_id> [--content "content"] [--name "name"] [--sub-title "subtitle"]'
        );
      }
      const app = getApp();

      const page = await app.docService.editPage(docId, pageId, {
        ...(options.content !== null ? { content: options.content } : {}),
        ...(options.name !== null ? { name: options.name } : {}),
        ...(options.subTitle !== null ? { subTitle: options.subTitle } : {}),
        ...(options.contentEditMode !== null ? { contentEditMode: options.contentEditMode } : {}),
        ...(options.contentFormat !== null ? { contentFormat: options.contentFormat } : {}),
      });

      return formatResult(page, `Page updated successfully${page.id ? `\nID: ${page.id}` : ''}`);
    },
  };
}
