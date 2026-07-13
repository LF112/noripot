import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  Moon,
  Network,
  Sprout,
  Sun,
  Timer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import type { ViewKey } from '../types';
import { IconButton } from './ui';

const navigation: Array<{
  key: ViewKey;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: 'overview', label: '概览', icon: LayoutDashboard },
  { key: 'scripts', label: '脚本实例', icon: Boxes },
  { key: 'gateways', label: '网关路由', icon: Network },
  { key: 'cron', label: '计划任务', icon: Timer },
  { key: 'repositories', label: 'Git 仓库', icon: GitBranch },
];

interface AppLayoutProps {
  active: ViewKey;
  children: ReactNode;
  onNavigate: (view: ViewKey) => void;
}

export function AppLayout({ active, children, onNavigate }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () =>
      setTheme(systemTheme.matches ? 'dark' : 'light');
    systemTheme.addEventListener('change', syncSystemTheme);
    return () => systemTheme.removeEventListener('change', syncSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        meta.setAttribute('content', theme === 'dark' ? '#171717' : '#fafafa');
      });
  }, [theme]);

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-20 flex w-[232px] flex-col border-r border-border bg-surface-inset transition-[width] duration-180 ease-out motion-reduce:transition-none max-[720px]:hidden',
          collapsed && 'w-[72px]',
        )}
        data-state={collapsed ? 'collapsed' : 'expanded'}
      >
        <div
          className={cn(
            'flex h-[66px] items-center gap-3 overflow-hidden border-b border-secondary px-[18px]',
            collapsed && 'justify-center px-0',
          )}
        >
          <div className="grid size-[34px] shrink-0 place-items-center rounded-lg border border-primary/35 bg-primary/6 text-primary">
            <Sprout size={19} />
          </div>
          <div
            className={cn(
              'flex min-w-[130px] flex-col gap-0.5',
              collapsed && 'hidden',
            )}
          >
            <span>NoriPot</span>
            <small className="font-mono text-[10px] leading-[1.4] text-muted-foreground uppercase">
              CONTROL PLANE
            </small>
          </div>
        </div>

        <nav
          className="flex flex-1 flex-col gap-1 px-3 py-4"
          aria-label="主导航"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={active === item.key ? 'page' : undefined}
                className={cn(
                  'flex h-10 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-md border border-transparent px-[11px] text-left text-[13px] font-medium whitespace-nowrap text-muted-foreground hover:bg-surface-hover hover:text-foreground-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70',
                  collapsed && 'justify-center px-0 [&>span]:hidden',
                  active === item.key &&
                    'border-border bg-muted text-foreground [&>svg]:text-primary',
                )}
                key={item.key}
                onClick={() => onNavigate(item.key)}
                title={collapsed ? item.label : undefined}
                type="button"
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          className={cn(
            'flex min-h-[66px] items-center justify-between gap-2 overflow-hidden border-t border-secondary p-3',
            collapsed && 'min-h-[108px] flex-col-reverse justify-center',
          )}
        >
          <button
            aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
            aria-pressed={theme === 'dark'}
            className={cn(
              'flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 text-[11px] font-medium text-foreground-secondary hover:border-border hover:bg-muted hover:text-foreground-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70',
              collapsed &&
                'size-9 flex-none justify-center px-0 [&>span]:hidden',
            )}
            onClick={() =>
              setTheme((current) => (current === 'light' ? 'dark' : 'light'))
            }
            title={
              collapsed
                ? theme === 'light'
                  ? '深色模式'
                  : '浅色模式'
                : undefined
            }
            type="button"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
          </button>
          <IconButton
            label={collapsed ? '展开侧栏' : '收起侧栏'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </IconButton>
        </div>
      </aside>

      <div
        className={cn(
          'ml-[232px] min-h-screen w-[calc(100%-232px)] transition-[width,margin-left] duration-180 ease-out motion-reduce:transition-none max-[720px]:ml-0 max-[720px]:w-full',
          collapsed && 'ml-[72px] w-[calc(100%-72px)]',
        )}
      >
        <header className="sticky top-0 z-15 hidden h-14 items-center border-b border-border/88 bg-background/92 px-4 backdrop-blur-xl max-[720px]:flex">
          <div className="flex items-center gap-2 text-[13px] font-medium text-primary">
            <Sprout size={18} />
            <span>NoriPot</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-[38px] pt-9 pb-14 max-[720px]:px-4 max-[720px]:pt-6 max-[720px]:pb-[92px]">
          {children}
        </main>
        <nav
          className="fixed inset-x-0 bottom-0 z-30 hidden min-h-16 grid-cols-5 border-t border-border bg-surface-inset/96 px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur-xl max-[720px]:grid"
          aria-label="移动端导航"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={active === item.key ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1 border-0 bg-transparent text-[9px] text-foreground-subtle focus-visible:outline-2 focus-visible:outline-primary/70',
                  active === item.key && 'text-primary',
                )}
                key={item.key}
                onClick={() => onNavigate(item.key)}
                type="button"
              >
                <Icon size={18} />
                <span>
                  {item.label
                    .replace('实例', '')
                    .replace('路由', '')
                    .replace('任务', '')}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
