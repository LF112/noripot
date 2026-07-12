import {
  ExternalLink,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  Route,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui';
import type { ActionRunner, GatewayRecord, ScriptRecord } from '../types';

interface GatewaysProps {
  gateways: GatewayRecord[];
  scripts: ScriptRecord[];
  busy: string | null;
  runAction: ActionRunner;
}

export function Gateways({
  gateways,
  scripts,
  busy,
  runAction,
}: GatewaysProps) {
  const [editing, setEditing] = useState<GatewayRecord | 'new' | null>(null);
  const record = editing && editing !== 'new' ? editing : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await runAction(
      'gateway:save',
      '/api/gateway/upsert',
      {
        id: record?.id,
        pathname: form.get('pathname'),
        port: Number(form.get('port')),
        path: form.get('path'),
      },
      '网关路由已保存',
    );
    if (ok) setEditing(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="REVERSE PROXY"
        title="网关路由"
        description="将公开路径映射到脚本实例端口。"
        actions={
          <>
            <Button
              loading={busy === 'gateway:reload'}
              onClick={() =>
                runAction(
                  'gateway:reload',
                  '/api/gateway/reload',
                  {},
                  'Caddy 配置已重载',
                )
              }
            >
              <RefreshCw size={15} />
              重载
            </Button>
            <Button onClick={() => setEditing('new')} variant="primary">
              <Plus size={15} />
              新建路由
            </Button>
          </>
        }
      />

      {gateways.length ? (
        <section className="gateway-grid">
          {gateways.map((gateway) => (
            <article className="gateway-card" key={gateway.id}>
              <header>
                <div className="gateway-icon">
                  <Route size={18} />
                </div>
                <div className="row-actions">
                  <IconButton
                    label="编辑路由"
                    onClick={() => setEditing(gateway)}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label="删除路由"
                    variant="danger"
                    onClick={() =>
                      runAction(
                        `gateway:remove:${gateway.id}`,
                        '/api/gateway/remove',
                        { id: gateway.id },
                        '网关路由已删除',
                      )
                    }
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </header>
              <div className="gateway-path">
                <strong>{gateway.path}</strong>
                <ExternalLink size={14} />
              </div>
              <dl>
                <div>
                  <dt>目标脚本</dt>
                  <dd>{gateway.pathname}</dd>
                </div>
                <div>
                  <dt>上游端口</dt>
                  <dd className="mono">127.0.0.1:{gateway.port}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <section className="table-panel">
          <EmptyState
            action={
              <Button onClick={() => setEditing('new')} variant="primary">
                <Plus size={15} />
                新建路由
              </Button>
            }
            icon={<Network size={22} />}
            title="暂无网关路由"
            description="创建一条路由以公开脚本服务。"
          />
        </section>
      )}

      <Modal
        description="路径与端口在全部路由中必须唯一。"
        open={Boolean(editing)}
        title={record ? '编辑网关路由' : '新建网关路由'}
        onClose={() => setEditing(null)}
      >
        <form
          className="modal-form"
          key={record?.id ?? 'new'}
          onSubmit={submit}
        >
          <Field label="目标脚本">
            <Select
              defaultValue={record?.pathname ?? ''}
              name="pathname"
              required
            >
              <SelectTrigger aria-label="目标脚本">
                <SelectValue placeholder="选择脚本" />
              </SelectTrigger>
              <SelectContent>
                {scripts.map((script) => (
                  <SelectItem key={script.pathname} value={script.pathname}>
                    {script.pathname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="form-grid">
            <Field label="公开路径">
              <Input
                defaultValue={record?.path ?? ''}
                name="path"
                pattern="/.*"
                placeholder="/api/*"
                required
              />
            </Field>
            <Field label="上游端口">
              <Input
                defaultValue={record?.port ?? ''}
                max={65535}
                min={1}
                name="port"
                placeholder="8080"
                required
                type="number"
              />
            </Field>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setEditing(null)} type="button">
              取消
            </Button>
            <Button
              loading={busy === 'gateway:save'}
              type="submit"
              variant="primary"
            >
              {record ? '保存路由' : '创建路由'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
