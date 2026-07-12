import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  Network,
  RefreshCw,
  Sprout,
  Timer,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
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
  loading: boolean;
  children: ReactNode;
  onNavigate: (view: ViewKey) => void;
  onRefresh: () => void;
}

export function AppLayout({
  active,
  loading,
  children,
  onNavigate,
  onRefresh,
}: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <aside
        className={collapsed ? 'sidebar collapsed' : 'sidebar'}
        data-state={collapsed ? 'collapsed' : 'expanded'}
      >
        <div className="brand">
          <div className="brand-mark">
            <Sprout size={19} />
          </div>
          <div className="brand-copy">
            <span>NoriPot</span>
            <small>CONTROL PLANE</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="主导航">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={active === item.key ? 'page' : undefined}
                className={active === item.key ? 'nav-item active' : 'nav-item'}
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

        <div className="sidebar-footer">
          <div className="service-status">
            <span className="pulse-dot" />
            <div>
              <strong>服务已连接</strong>
            </div>
          </div>
          <IconButton
            label={collapsed ? '展开侧栏' : '收起侧栏'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </IconButton>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Sprout size={18} />
            <span>NoriPot</span>
          </div>
          <IconButton label="刷新数据" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
          </IconButton>
        </header>
        <main className="content">{children}</main>
        <nav className="mobile-nav" aria-label="移动端导航">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={active === item.key ? 'page' : undefined}
                className={active === item.key ? 'active' : ''}
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
