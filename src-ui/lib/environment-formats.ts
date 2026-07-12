import { parseDocument, stringify } from 'yaml';

export type EnvironmentSourceFormat = 'env' | 'linux' | 'windows' | 'yaml';

export type EnvironmentEntry = { key: string; value: string };

const environmentKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function validateEnvironmentEntries(entries: EnvironmentEntry[]) {
  for (const entry of entries) {
    if (!environmentKeyPattern.test(entry.key)) {
      throw new Error(`无效的环境变量键名：${entry.key || '（空）'}`);
    }
  }
  if (new Set(entries.map(({ key }) => key)).size !== entries.length) {
    throw new Error('环境变量键名不能重复');
  }
  return entries;
}

function splitStatements(source: string) {
  const statements: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;
  let escaped = false;

  for (const character of source.replace(/\r\n?/g, '\n')) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\' && quote === 'double') {
      current += character;
      escaped = true;
      continue;
    }
    if (character === "'" && quote !== 'double') {
      quote = quote === 'single' ? null : 'single';
    } else if (character === '"' && quote !== 'single') {
      quote = quote === 'double' ? null : 'double';
    }
    if (character === '\n' && !quote) {
      statements.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (quote) throw new Error('存在未闭合的引号');
  statements.push(current);
  return statements;
}

function decodeQuotedValue(value: string, shell = false) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    const content = trimmed.slice(1, -1);
    return content.replace(/\\([\\"nrt$`])/g, (_, escaped: string) => {
      if (shell && !['\\', '"', '$', '`'].includes(escaped))
        return `\\${escaped}`;
      return { n: '\n', r: '\r', t: '\t' }[escaped] ?? escaped;
    });
  }
  return trimmed;
}

function parseAssignments(source: string, format: 'env' | 'linux') {
  const entries: EnvironmentEntry[] = [];
  for (const rawStatement of splitStatements(source)) {
    let statement = rawStatement.trim();
    if (!statement || statement.startsWith('#')) continue;
    if (format === 'linux') {
      if (!statement.startsWith('export ')) {
        throw new Error(`Linux 格式应以 export 开头：${statement}`);
      }
      statement = statement.slice(7).trim();
    }
    const separator = statement.indexOf('=');
    if (separator < 1) throw new Error(`缺少 KEY=value：${statement}`);
    entries.push({
      key: statement.slice(0, separator).trim(),
      value: decodeQuotedValue(
        statement.slice(separator + 1),
        format === 'linux',
      ),
    });
  }
  return validateEnvironmentEntries(entries);
}

function parseWindows(source: string) {
  const entries: EnvironmentEntry[] = [];
  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line || /^rem(?:\s|$)/i.test(line) || line.startsWith('::')) continue;
    const match = line.match(
      /^set\s+(?:"([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)"|([^=\s]+)=([\s\S]*))$/i,
    );
    if (!match) throw new Error(`无效的 Windows CMD 变量：${line}`);
    entries.push({
      key: (match[1] ?? match[3]) as string,
      value: (match[2] ?? match[4]) as string,
    });
  }
  return validateEnvironmentEntries(entries);
}

function parseYaml(source: string) {
  if (!source.trim()) return [];
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) throw document.errors[0];
  const value: unknown = document.toJS();
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('YAML 顶层必须是键值映射');
  }
  const entries = Object.entries(value).map(([key, item]) => {
    if (typeof item !== 'string') {
      throw new Error(`YAML 变量 ${key} 的值必须是字符串`);
    }
    return { key, value: item };
  });
  return validateEnvironmentEntries(entries);
}

export function parseEnvironmentSource(
  source: string,
  format: EnvironmentSourceFormat,
) {
  if (format === 'yaml') return parseYaml(source);
  if (format === 'windows') return parseWindows(source);
  return parseAssignments(source, format);
}

function quote(value: string) {
  return JSON.stringify(value);
}

function quoteShell(value: string) {
  return `"${value.replace(/[\\"$`]/g, '\\$&')}"`;
}

export function serializeEnvironmentSource(
  entries: EnvironmentEntry[],
  format: EnvironmentSourceFormat,
) {
  const validEntries = validateEnvironmentEntries(entries);
  if (format === 'yaml') {
    return stringify(
      Object.fromEntries(validEntries.map(({ key, value }) => [key, value])),
      {
        defaultKeyType: 'PLAIN',
        defaultStringType: 'QUOTE_DOUBLE',
        lineWidth: 0,
      },
    ).trimEnd();
  }
  if (format === 'windows') {
    const multilineEntry = validEntries.find(({ value }) =>
      /[\r\n]/.test(value),
    );
    if (multilineEntry) {
      throw new Error(`Windows CMD 格式不支持换行值：${multilineEntry.key}`);
    }
    return validEntries
      .map(({ key, value }) => `set "${key}=${value}"`)
      .join('\n');
  }
  const prefix = format === 'linux' ? 'export ' : '';
  return validEntries
    .map(
      ({ key, value }) =>
        `${prefix}${key}=${format === 'linux' ? quoteShell(value) : quote(value)}`,
    )
    .join('\n');
}
