import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Clock, FolderPlus, CheckSquare, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { dashboardApi } from '../lib/resources';
import { Card, ProgressBar, PriorityBadge, RoleBadge, Avatar } from '../components/ui/Display';
import { Skeleton, EmptyState } from '../components/ui/Overlay';
import { useAuth } from '../context/AuthContext';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['workspace-dashboard'], queryFn: () => dashboardApi.get().then((r) => r.data.data) });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {greeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Here's where things stand across every project you're part of.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <StatRow data={data} />

          <div className="mt-8 grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <ProjectSection title="My Projects" projects={data.myProjects} />
              <ProjectSection title="Shared With Me" projects={data.sharedWithMe} />
            </div>
            <div className="space-y-6">
              <DeadlineList title="Overdue" tone="coral" tasks={data.overdueTasks} />
              <DeadlineList title="Upcoming this week" tone="amber" tasks={data.upcomingDeadlines} />
              <ActivityFeed items={data.recentActivity} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const STAT_CHIP = {
  indigo: 'bg-indigo-faint text-indigo',
  coral: 'bg-coral-faint text-coral',
  signal: 'bg-signal-faint text-signal-dim',
  amber: 'bg-amber-faint text-amber',
};

function StatRow({ data }) {
  const stats = [
    { label: 'Open tasks assigned to you', value: data.myOpenTaskCount, icon: CheckSquare, accent: 'indigo' },
    { label: 'Overdue', value: data.overdueTasks.length, icon: AlertTriangle, accent: data.overdueTasks.length > 0 ? 'coral' : 'signal' },
    { label: 'Due this week', value: data.upcomingDeadlines.length, icon: Clock, accent: 'amber' },
    { label: 'Projects you are part of', value: data.myProjects.length + data.sharedWithMe.length, icon: Layers, accent: 'signal' },
  ];
  return (
    <div className="mt-6 grid grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label} accent={s.accent} hover className="p-4">
          <div className="flex items-center justify-between">
            <p className="tabular text-2xl font-bold text-ink">{s.value}</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-md ${STAT_CHIP[s.accent]}`}>
              <s.icon size={15} />
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}

function ProjectSection({ title, projects }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="tabular text-xs text-ink-faint">{projects.length}</span>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Nothing here yet"
          description={title === 'My Projects' ? 'Create your first project to get started.' : 'Projects others share with you will show up here.'}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {projects.map((p) => (
            <Link key={p._id} to={`/projects/${p._id}`}>
              <Card hover className="p-4">
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-paper text-lg">{p.icon}</span>
                  <RoleBadge role={p.myRole} />
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-ink">{p.name}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-ink-muted">
                    <span>Progress</span>
                    <span className="tabular">{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DeadlineList({ title, tone, tasks }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
        {tone === 'coral' && <AlertTriangle size={14} className="text-coral" />}
        {tone === 'amber' && <Clock size={14} className="text-amber" />}
        {title}
      </h3>
      {tasks.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-ink-faint">
          <CheckCircle2 size={15} className="text-signal" /> All caught up.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((t) => (
            <li key={t._id}>
              <Link to={`/projects/${t.projectId?._id}/tasks?taskId=${t._id}`} className="flex items-center justify-between gap-2 text-sm hover:text-signal-dim">
                <span className="truncate text-ink">{t.title}</span>
                <PriorityBadge priority={t.priority} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Capped to the 4 most recent items — the full, paginated cross-project
// feed lives at /activity (see the "Activity" link in the sidebar) so
// this widget stays compact no matter how much history accumulates.
function ActivityFeed({ items }) {
  const shown = items.slice(0, 4);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Recent activity</h3>
        {items.length > 0 && (
          <Link to="/activity" className="flex items-center gap-0.5 text-xs font-medium text-signal-dim hover:underline">
            View all <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-ink-faint">No recent activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((a) => (
            <li key={a._id} className="flex items-start gap-2.5">
              <Avatar name={a.actor?.name} size={6} />
              <div className="min-w-0 text-sm text-ink-muted">
                <span className="font-medium text-ink">{a.actor?.name}</span> {describeAction(a.action)}
                <div className="text-xs text-ink-faint">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function describeAction(action) {
  const map = {
    TASK_CREATED: 'created a task',
    TASK_UPDATED: 'updated a task',
    TASK_STATUS_CHANGED: 'changed a task status',
    TASK_DELETED: 'deleted a task',
    PROJECT_CREATED: 'created the project',
    PROJECT_UPDATED: 'updated project settings',
    MEMBER_INVITED: 'invited a member',
    INVITATION_ACCEPTED: 'accepted an invitation',
    MEMBER_ROLE_CHANGED: "changed a teammate's role",
    MEMBER_REMOVED: 'removed a member',
    MEMBER_LEFT: 'left the project',
    MILESTONE_CREATED: 'created a milestone',
    MILESTONE_UPDATED: 'updated a milestone',
    COMMENT_ADDED: 'commented',
  };
  return map[action] || action.replace(/_/g, ' ').toLowerCase();
}