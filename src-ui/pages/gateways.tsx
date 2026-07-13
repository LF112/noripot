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
        description="将公开路径映射到脚本实例端口"
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
        <section className="grid grid-cols-3 gap-4 max-[1050px]:grid-cols-2 max-[720px]:grid-cols-1">
          {gateways.map((gateway) => (
            <article
              className="min-w-0 rounded-lg border border-[#2e2e2e] bg-[#191919] p-[18px] hover:border-[#393939]"
              key={gateway.id}
            >
              <header className="flex items-center justify-between">
                <div className="grid size-[34px] shrink-0 place-items-center rounded-[7px] border border-primary/25 bg-primary/5 text-primary">
                  <Route size={18} />
                </div>
                <div className="flex items-center justify-end gap-0.5">
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
              <div className="my-[18px] flex items-center justify-start gap-2">
                <strong className="truncate text-lg font-normal">
                  {gateway.path}
                </strong>
                <ExternalLink className="text-[#646464]" size={14} />
              </div>
              <dl className="m-0 flex flex-col gap-2.5 border-t border-[#2e2e2e] pt-[15px]">
                <div className="flex min-w-0 justify-between gap-3.5">
                  <dt className="text-[11px] text-[#646464]">目标脚本</dt>
                  <dd className="m-0 truncate text-right text-[11px] text-[#b4b4b4]">
                    {gateway.pathname}
                  </dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3.5">
                  <dt className="text-[11px] text-[#646464]">上游端口</dt>
                  <dd className="m-0 truncate text-right font-mono text-[11px] text-[#b4b4b4]">
                    127.0.0.1:{gateway.port}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-[#2e2e2e] bg-[#191919]">
          <EmptyState
            action={
              <Button onClick={() => setEditing('new')} variant="primary">
                <Plus size={15} />
                新建路由
              </Button>
            }
            icon={<Network size={22} />}
            title="暂无网关路由"
            description="创建一条路由以公开脚本服务"
          />
        </section>
      )}

      <Modal
        description="路径与端口在全部路由中必须唯一"
        open={Boolean(editing)}
        title={record ? '编辑网关路由' : '新建网关路由'}
        onClose={() => setEditing(null)}
      >
        <form
          className="flex flex-col gap-[17px] p-5"
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
          <div className="grid grid-cols-2 gap-3.5 max-[520px]:grid-cols-1">
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
          <div className="mx-[-20px] mt-1 mb-[-20px] flex justify-end gap-2 border-t border-[#2e2e2e] px-5 py-[15px]">
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
