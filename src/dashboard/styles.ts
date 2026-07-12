import { type FSWatcher, watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tailwind from 'bun-plugin-tailwind';

const uiDirectory = join(import.meta.dir, '../../src-ui');
const sourcePath = join(uiDirectory, 'styles.css');
const outputPath = join(uiDirectory, 'styles.generated.css');
const buildDirectory = join(tmpdir(), 'noripot-ui-build');

export async function buildDashboardStyles() {
  await mkdir(buildDirectory, { recursive: true });
  const result = await Bun.build({
    entrypoints: [sourcePath],
    outdir: buildDirectory,
    plugins: [tailwind],
  });

  if (!result.success || !result.outputs[0]) {
    throw new AggregateError(result.logs, '控制面板样式构建失败');
  }

  const next = await result.outputs[0].text();
  const current = await readFile(outputPath, 'utf8').catch(() => '');
  if (next !== current) {
    await writeFile(outputPath, next);
  }
}

export function watchDashboardStyles(
  onError: (error: unknown) => void,
): FSWatcher {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();

  return watch(uiDirectory, { recursive: true }, (_event, filename) => {
    if (!filename || filename.endsWith('styles.generated.css')) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(buildDashboardStyles).catch(onError);
    }, 60);
  });
}
