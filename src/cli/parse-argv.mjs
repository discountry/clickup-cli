import { CliUsageError } from '../errors.mjs';
import { OPTION_DEFINITIONS } from './commands.mjs';

const OPTION_NAME_TO_DEFINITION = new Map();
for (const definition of OPTION_DEFINITIONS) {
  for (const name of definition.names) {
    OPTION_NAME_TO_DEFINITION.set(name, definition);
  }
}

function defaultOptions() {
  return {
    help: false,
    json: false,
    subtasks: false,
    me: false,
    assignee: null,
    due: null,
    description: null,
    content: null,
    name: null,
    subTitle: null,
    parentPageId: null,
    contentFormat: null,
    contentEditMode: null,
    id: null,
    creator: null,
    deleted: false,
    archived: false,
    parentId: null,
    parentType: null,
    limit: null,
    maxPageDepth: null,
  };
}

export function parseArgv(argv) {
  const options = defaultOptions();
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (token.startsWith('-') && token !== '-') {
      const [optionName, inlineValue] = token.split(/=(.*)/s, 2);
      const definition = OPTION_NAME_TO_DEFINITION.get(optionName);
      if (!definition) {
        positionals.push(token);
        continue;
      }

      if (definition.type === 'boolean') {
        if (inlineValue !== undefined) {
          throw new CliUsageError(`Option ${optionName} does not take a value.`);
        }
        options[definition.key] = true;
        continue;
      }

      const value = inlineValue !== undefined ? inlineValue : argv[index + 1];
      if (value === undefined) {
        throw new CliUsageError(`Option ${optionName} requires a value.`);
      }
      index += inlineValue === undefined ? 1 : 0;
      options[definition.key] = value;
      continue;
    }

    positionals.push(token);
  }

  const [command = null, ...args] = positionals;
  return {
    command,
    args,
    options,
  };
}
