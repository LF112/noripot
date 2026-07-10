export const serializeLogValues = (values: readonly unknown[]): string => {
  if (values.length === 0) {
    return '';
  }

  return values.map((value) => serializeLogValue(value)).join(' ');
};

const serializeLogValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  if (typeof value === 'bigint') {
    return `${value}n`;
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  try {
    const visited = new WeakSet<object>();

    return JSON.stringify(
      value,
      (_key, currentValue: unknown) => {
        if (typeof currentValue === 'bigint') {
          return `${currentValue}n`;
        }

        if (currentValue instanceof Error) {
          return {
            name: currentValue.name,
            message: currentValue.message,
            stack: currentValue.stack,
          };
        }

        if (currentValue instanceof Map) {
          return Object.fromEntries(currentValue);
        }

        if (currentValue instanceof Set) {
          return [...currentValue];
        }

        if (typeof currentValue === 'object' && currentValue !== null) {
          if (visited.has(currentValue)) {
            return '[Circular]';
          }

          visited.add(currentValue);
        }

        return currentValue;
      },
      2,
    );
  } catch {
    return String(value);
  }
};
