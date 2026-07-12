import {
  Clock3,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
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
        <section className="repo-list">
          {repositories.map((repo) => (
            <article className="repo-row" key={repo.pathname}>
              <div className="repo-main">
                <span className="repo-icon">
                  <GitBranch size={18} />
                </span>
                <div>
                  <strong>{repo.pathname}</strong>
                  <a
                    href={publicRepositoryUrl(repo.url)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {maskRepositoryUrl(repo.url)}
                  </a>
                  <div className="repo-commit">
                    <GitCommitHorizontal size={13} />
                    {repo.commitHash ? (
                      <>
                        <code title={repo.commitHash}>
                          {repo.commitHash.slice(0, 8)}
                        </code>
                        <span title={repo.commitMessage ?? undefined}>
                          {repo.commitMessage || '无提交说明'}
                        </span>
                      </>
                    ) : (
                      <span>尚未记录同步信息</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="repo-sync-meta">
                <div className="branch-chip">
                  <GitBranch size={13} />
                  {repo.branch || '默认分支'}
                </div>
                <span>
                  <Clock3 size={12} />
                  {repo.updatedAt
                    ? `更新于 ${formatRepositoryTime(repo.updatedAt)}`
                    : '等待首次同步'}
                </span>
              </div>
              <div className="row-actions">
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
        <section className="table-panel">
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const token = String(form.get('token') ?? '');
    const ok = await runAction(
      `git:save:${record?.pathname ?? 'new'}`,
      '/api/git/upsert',
      {
        pathname: form.get('pathname'),
        url: form.get('url'),
        branch: String(form.get('branch') || '') || null,
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
          className="modal-form"
          key={record?.pathname ?? 'new'}
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
          <div className="form-grid">
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
          <div className="modal-actions">
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
