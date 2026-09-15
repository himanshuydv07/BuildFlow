import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { tasksApi } from '../lib/resources';
import { Select } from '../components/ui/Form';
import { Card, StatusBadge, PriorityBadge } from '../components/ui/Display';
import { EmptyState, Skeleton } from '../components/ui/Overlay';

export default function MyTasksPage() {
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks', filters],
    queryFn: () =>
      tasksApi
        .myTasks({ ...(filters.status && { status: filters.status }), ...(filters.priority && { priority: filters.priority }) })
        .then((r) => r.data.data.tasks),
  });

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">My Tasks</h1>
      <p className="mt-1 text-sm text-ink-muted">Everything assigned to you, across every project.</p>

      <div className="mt-6 flex gap-3">
        <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="w-44">
          <option value="">All statuses</option>
          {['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE'].map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <Select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className="w-44">
          <option value="">All priorities</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nothing assigned to you" description="Tasks assigned to you across all your projects will show up here." />
        ) : (
          <Card className="divide-y divide-line">
            {data.map((t) => (
              <Link
                key={t._id}
                to={`/projects/${t.projectId._id}/tasks?taskId=${t._id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-paper"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{t.projectId.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{t.title}</p>
                    <p className="text-xs text-ink-muted">{t.projectId.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {t.dueDate && <span className="text-xs text-ink-faint">{format(new Date(t.dueDate), 'MMM d')}</span>}
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
