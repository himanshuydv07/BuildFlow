import { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ListTodo } from 'lucide-react';
import { tasksApi } from '../../lib/resources';
import { Select } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import { Card, StatusBadge, PriorityBadge, Avatar } from '../../components/ui/Display';
import { EmptyState, Skeleton } from '../../components/ui/Overlay';
import CreateTaskModal from '../../components/tasks/CreateTaskModal';
import TaskDrawer from '../../components/tasks/TaskDrawer';

export default function ProjectTasksPage() {
  const { project, myRole } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const canCreate = ['OWNER', 'ADMIN'].includes(myRole);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', project._id, filters],
    queryFn: () =>
      tasksApi
        .list(project._id, { ...(filters.status && { status: filters.status }), ...(filters.priority && { priority: filters.priority }) })
        .then((r) => r.data.data.tasks),
  });

  const taskId = params.get('taskId');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-3">
          <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="w-40">
            <option value="">All statuses</option>
            {['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE'].map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </Select>
          <Select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className="w-40">
            <option value="">All priorities</option>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> New task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks match these filters" description="Try clearing filters, or create a new task." />
      ) : (
        <Card className="divide-y divide-line">
          {tasks.map((t) => (
            <button
              key={t._id}
              onClick={() => setParams({ taskId: t._id })}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-paper"
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={t.status} />
                <span className="text-sm font-medium text-ink">{t.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <PriorityBadge priority={t.priority} />
                {t.assignee && <Avatar name={t.assignee.name} size={6} />}
              </div>
            </button>
          ))}
        </Card>
      )}

      <CreateTaskModal projectId={project._id} open={createOpen} onClose={() => setCreateOpen(false)} />
      {taskId && <TaskDrawer projectId={project._id} taskId={taskId} myRole={myRole} onClose={() => setParams({})} />}
    </div>
  );
}
