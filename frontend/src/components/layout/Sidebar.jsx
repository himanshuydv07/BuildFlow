import { NavLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '../ui/Logo';
import { LayoutDashboard, CheckSquare, Bell, Plus, Activity, StickyNote, Mail } from 'lucide-react';
import { projectsApi, invitationsApi } from '../../lib/resources';


const navItemClass = ({ isActive }) =>
  `group flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'border-signal bg-white/[0.06] text-white'
      : 'border-transparent text-white/55 hover:border-white/15 hover:bg-white/[0.04] hover:text-white'
  }`;

export default function Sidebar({ onCreateProject }) {
  const { data } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list().then((r) => r.data.data) });
  const { projectId } = useParams();
  const owned = data?.owned || [];
  const shared = data?.shared || [];
  const { data: pendingCount } = useQuery({
  queryKey: ['invitations-mine-count'],
  queryFn: () => invitationsApi.listMine().then((r) => r.data.data.invitations.length),
  refetchInterval: 30000,
});

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-sidebar-gradient text-white">
      <div className="px-5 py-5">
        <Logo dark />
      </div>

      <nav className="space-y-0.5 px-3">
        <NavLink to="/dashboard" className={navItemClass}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/my-tasks" className={navItemClass}>
          <CheckSquare size={16} /> My Tasks
        </NavLink>
        
        <NavLink to="/notifications" className={navItemClass}>
          <Bell size={16} /> Notifications
        </NavLink>
        <NavLink to="/invitations" className={navItemClass}>
  <Mail size={16} /> Invitations
  {pendingCount > 0 && (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
      {pendingCount}
    </span>
  )}
</NavLink>
        <NavLink to="/notes" className={navItemClass}>
          <StickyNote size={16} /> Notes
        </NavLink>
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto px-3 pb-3">
        <SectionHeader label="My Projects" onAdd={onCreateProject} />
        <ProjectList projects={owned} activeId={projectId} />

        {shared.length > 0 && (
          <>
            <SectionHeader label="Shared With Me" />
            <ProjectList projects={shared} activeId={projectId} />
          </>
        )}
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-white/40">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
          </span>
          <Activity size={12} /> All systems normal
        </div>
      </div>
    </aside>
  );
}

function SectionHeader({ label, onAdd }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-3 pt-4">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/30">{label}</span>
      {onAdd && (
        <button onClick={onAdd} className="rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white" aria-label="New project">
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

function ProjectList({ projects, activeId }) {
  if (projects.length === 0) {
    return <p className="px-3 py-1 text-xs text-white/25">Nothing here yet</p>;
  }
  return (
    <div className="space-y-0.5">
      {projects.map((p) => (
        <NavLink
          key={p._id}
          to={`/projects/${p._id}`}
          className={`flex items-center gap-2 rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors ${
            activeId === p._id
              ? 'border-signal bg-white/[0.06] text-white'
              : 'border-transparent text-white/55 hover:border-white/15 hover:bg-white/[0.04] hover:text-white'
          }`}
        >
          <span className="text-base leading-none">{p.icon || '📁'}</span>
          <span className="truncate">{p.name}</span>
        </NavLink>
      ))}
    </div>
  );
}
