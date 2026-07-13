import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Network,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { api } from '../api';
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
} from '../components/ui';
import type { ActionRunner, RepositoryRecord, ScriptRecord } from '../types';

interface RepositoriesProps {
  repositories: RepositoryRecord[];
  scripts: ScriptRecord[];
  busy: string | null;
  runAction: ActionRunner;
}

export function Repositories({
  repositories,
  scripts,
  busy,
  runAction,
}: RepositoriesProps) {
  const [editing, setEditing] = useState<RepositoryRecord | 'new' | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="SOURCE CONTROL"
        title="Git 仓库"
        description="管理脚本目录的远端来源与同步分支"
        actions={
          <Button onClick={() => setEditing('new')} variant="primary">
            <Plus size={15} />
            添加仓库
          </Button>
        }
      />

      {repositories.length ? (
        <section className="overflow-hidden rounded-lg border border-[#2e2e2e] bg-[#191919]">
          {repositories.map((repo) => (
            <article
              className="grid min-h-[94px] grid-cols-[minmax(300px,1fr)_180px_120px] items-center gap-5 border-b border-[#242424] px-[18px] py-3 last:border-b-0 max-[720px]:grid-cols-[minmax(0,1fr)_auto] max-[720px]:gap-3"
              key={repo.pathname}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-[7px] border border-primary/25 bg-primary/5 text-primary">
                  <GitBranch size={18} />
                </span>
                <div>
                  <strong className="block truncate text-[13px] font-medium text-[#efefef]">
                    {repo.pathname}
                  </strong>
                  <a
                    className="mt-1 block truncate text-[11px] text-[#898989] no-underline hover:text-[#00c573]"
                    href={publicRepositoryUrl(repo.url)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {maskRepositoryUrl(repo.url)}
                  </a>
                  <div className="mt-[7px] flex min-w-0 items-center gap-[7px] text-[10px] text-[#646464]">
                    <GitCommitHorizontal
                      className="shrink-0 text-primary"
                      size={13}
                    />
                    {repo.commitHash ? (
                      <>
                        <code
                          className="shrink-0 text-[10px] text-[#b4b4b4]"
                          title={repo.commitHash}
                        >
                          {repo.commitHash.slice(0, 8)}
                        </code>
                        <span
                          className="truncate"
                          title={repo.commitMessage ?? undefined}
                        >
                          {repo.commitMessage || '无提交说明'}
                        </span>
                      </>
                    ) : (
                      <span>尚未记录同步信息</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 flex-col items-start gap-[7px] max-[720px]:col-start-1 max-[720px]:row-start-2 [&>span]:flex [&>span]:items-center [&>span]:gap-[5px] [&>span]:text-[9px] [&>span]:whitespace-nowrap [&>span]:text-[#646464]">
                <div className="inline-flex w-max max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-[#363636] bg-[#171717] px-[9px] py-[5px] font-mono text-[10px] whitespace-nowrap text-[#898989]">
                  <GitBranch size={13} />
                  {repo.branch || '默认分支'}
                </div>
                <span>
                  <Clock3 size={12} />
                  {repo.updatedAt
                    ? `更新于 ${formatRepositoryTime(repo.updatedAt)}`
                    : '等待首次同步'}
                </span>
                {repo.proxy ? (
                  <span title={repo.proxy}>
                    <Network size={12} />
                    使用代理
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-0.5 max-[720px]:col-start-2 max-[720px]:row-span-2 max-[720px]:row-start-1">
                <IconButton
                  label="拉取更新"
                  disabled={busy === `git:pull:${repo.pathname}`}
                  onClick={() =>
                    runAction(
                      `git:pull:${repo.pathname}`,
                      '/api/git/pull',
                      { pathname: repo.pathname },
                      '仓库已同步',
                    )
                  }
                >
                  <GitPullRequest size={16} />
                </IconButton>
                <IconButton label="编辑仓库" onClick={() => setEditing(repo)}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton
                  label="删除仓库配置"
                  variant="danger"
                  onClick={() =>
                    runAction(
                      `git:remove:${repo.pathname}`,
                      '/api/git/remove',
                      { pathname: repo.pathname },
                      '仓库配置已删除',
                    )
                  }
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-[#2e2e2e] bg-[#191919]">
          <EmptyState
            action={
              <Button onClick={() => setEditing('new')} variant="primary">
                <Plus size={15} />
                添加仓库
              </Button>
            }
            icon={<GitBranch size={22} />}
            title="暂无 Git 仓库"
            description="关联远端仓库以同步脚本源代码"
          />
        </section>
      )}

      <RepositoryForm
        busy={busy}
        repository={editing}
        scripts={scripts}
        onClose={() => setEditing(null)}
        runAction={runAction}
      />
    </>
  );
}

function RepositoryForm({
  repository,
  scripts,
  busy,
  onClose,
  runAction,
}: {
  repository: RepositoryRecord | 'new' | null;
  scripts: ScriptRecord[];
  busy: string | null;
  onClose: () => void;
  runAction: ActionRunner;
}) {
  const record = repository && repository !== 'new' ? repository : null;
  const formRef = useRef<HTMLFormElement>(null);
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyTest, setProxyTest] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  async function testProxy() {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const token = String(form.get('token') ?? '');
    setTestingProxy(true);
    setProxyTest(null);
    try {
      await api.post('/api/git/proxy/test', {
        ...(record ? { pathname: record.pathname } : {}),
        url: form.get('url'),
        proxy: form.get('proxy'),
        ...(token ? { token } : {}),
      });
      setProxyTest({ type: 'success', message: '代理连接正常' });
    } catch (cause) {
      setProxyTest({
        type: 'error',
        message: cause instanceof Error ? cause.message : '代理连接失败',
      });
    } finally {
      setTestingProxy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const token = String(form.get('token') ?? '');
    const proxy = String(form.get('proxy') ?? '').trim();
    const ok = await runAction(
      `git:save:${record?.pathname ?? 'new'}`,
      '/api/git/upsert',
      {
        pathname: form.get('pathname'),
        url: form.get('url'),
        branch: String(form.get('branch') || '') || null,
        proxy: proxy || null,
        ...(token ? { token } : {}),
      },
      record ? '仓库配置已更新' : '仓库已添加',
    );
    if (ok) onClose();
  }

  return (
    <Modal
      description={
        record ? '留空访问令牌可保留原有配置' : '新仓库会克隆到脚本工作区'
      }
      open={Boolean(repository)}
      title={record ? '编辑仓库' : '添加 Git 仓库'}
      onClose={onClose}
    >
      {repository ? (
        <form
          className="flex flex-col gap-[17px] p-5"
          key={record?.pathname ?? 'new'}
          ref={formRef}
          onSubmit={submit}
        >
          <Field label="脚本路径">
            <Input
              defaultValue={record?.pathname ?? ''}
              list="script-paths"
              name="pathname"
              placeholder="service/index.ts"
              readOnly={Boolean(record)}
              required
            />
            <datalist id="script-paths">
              {scripts.map((script) => (
                <option key={script.pathname} value={script.pathname} />
              ))}
            </datalist>
          </Field>
          <Field label="仓库地址">
            <Input
              defaultValue={record?.url ?? ''}
              name="url"
              placeholder="https://github.com/org/repo.git"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3.5 max-[520px]:grid-cols-1">
            <Field label="分支">
              <Input
                defaultValue={record?.branch ?? ''}
                name="branch"
                placeholder="main"
              />
            </Field>
            <Field label="访问令牌">
              <Input
                name="token"
                placeholder={record ? '保持不变' : '可选'}
                type="password"
              />
            </Field>
          </div>
          <Field label="代理地址" hint="可选，仅用于此仓库的 HTTP/HTTPS 拉取">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                defaultValue={record?.proxy ?? ''}
                name="proxy"
                placeholder="http://localhost:7890"
                type="url"
              />
              <Button
                loading={testingProxy}
                onClick={() => void testProxy()}
                type="button"
              >
                <Network size={15} />
                测试连接
              </Button>
            </div>
            {proxyTest ? (
              <div
                className={`grid grid-cols-[16px_minmax(0,1fr)] items-start gap-[7px] rounded-md border bg-[#141414] px-2.5 py-2 text-[10px] leading-[1.5] [overflow-wrap:anywhere] [&>svg]:mt-px ${
                  proxyTest.type === 'success'
                    ? 'border-primary/30 text-primary'
                    : 'border-red-400/30 text-red-400'
                }`}
                role={proxyTest.type === 'error' ? 'alert' : 'status'}
              >
                {proxyTest.type === 'success' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <AlertTriangle size={14} />
                )}
                <span>{proxyTest.message}</span>
              </div>
            ) : null}
          </Field>
          <div className="mx-[-20px] mt-1 mb-[-20px] flex justify-end gap-2 border-t border-[#2e2e2e] px-5 py-[15px]">
            <Button onClick={onClose} type="button">
              取消
            </Button>
            <Button
              loading={busy === `git:save:${record?.pathname ?? 'new'}`}
              type="submit"
              variant="primary"
            >
              保存仓库
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}

function maskRepositoryUrl(url: string) {
  return url.replace(/https:\/\/[^@/]+@/, 'https://');
}

function publicRepositoryUrl(url: string) {
  return maskRepositoryUrl(url).replace(/\.git$/, '');
}

function formatRepositoryTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
