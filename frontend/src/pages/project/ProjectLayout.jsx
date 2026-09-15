import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../lib/resources';
import { Skeleton } from '../../components/ui/Overlay';
import { RoleBadge } from '../../components/ui/Display';

const BASE_TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'tasks', label: 'Tasks' },
  { to: 'kanban', label: 'Kanban' },
  { to: 'calendar', label: 'Calendar' },
  { to: 'gantt', label: 'Gantt' },
  { to: 'milestones', label: 'Milestones' },
];
const SCRUM_TAB = { to: 'scrum', label: 'Scrum' };
const TRAILING_TABS = [
  { to: 'team', label: 'Team' },
  { to: 'files', label: 'Files' },
  { to: 'notes', label: 'Notes' },
  { to: 'analytics', label: 'Analytics' },
  { to: 'activity', label: 'Activity' },
  { to: 'assistant', label: 'Assistant' },
  { to: 'settings', label: 'Settings' },
];

const HEALTH_TONE = { HEALTHY: 'text-signal-dim bg-signal-faint', AT_RISK: 'text-amber bg-amber-faint', CRITICAL: 'text-coral bg-coral-faint' };

export default function ProjectLayout() {
  const { projectId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId).then((r) => r.data.data),
  });
  const { data: dash } = useQuery({
    queryKey: ['project-dashboard', projectId],
    queryFn: () => projectsApi.dashboard(projectId).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="px-8 py-8">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  const { project, myRole } = data;
  const tabs = [...BASE_TABS, ...(project.workflow === 'SCRUM' ? [SCRUM_TAB] : []), ...TRAILING_TABS];

  return (
    <div>
      <div className="border-b border-line bg-white px-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{project.icon}</span>
            <div>
              <h1 className="font-display text-xl font-bold text-ink">{project.name}</h1>
              <p className="text-xs text-ink-muted">{project.description || 'No description yet'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dash && <span className={`rounded-sm px-2 py-1 text-xs font-semibold ${HEALTH_TONE[dash.health]}`}>{dash.health.replace('_', ' ')}</span>}
            <RoleBadge role={myRole} />
          </div>
        </div>

        <nav className="mt-5 flex gap-5 overflow-x-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors ${
                  isActive ? 'border-signal text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="px-8 py-6">
        <Outlet context={{ project, myRole, dashboard: dash }} />
      </div>
    </div>
  );
}
