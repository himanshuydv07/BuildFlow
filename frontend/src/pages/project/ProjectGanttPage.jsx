import { useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, min, max, addDays } from 'date-fns';
import { GanttChartSquare } from 'lucide-react';
import { tasksApi } from '../../lib/resources';
import { EmptyState, Skeleton } from '../../components/ui/Overlay';
import TaskDrawer from '../../components/tasks/TaskDrawer';

const PRIORITY_COLOR = { LOW: 'bg-ink-faint', MEDIUM: 'bg-indigo', HIGH: 'bg-amber', CRITICAL: 'bg-coral' };

export default function ProjectGanttPage() {
  const { project, myRole } = useOutletContext();
  const [params, setParams] = useSearchParams();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', project._id, 'gantt'],
    queryFn: () => tasksApi.list(project._id, { limit: 100 }).then((r) => r.data.data.tasks),
  });

  const scheduled = useMemo(
    () =>
      (tasks || [])
        .filter((t) => t.startDate || t.dueDate)
        .map((t) => ({ ...t, start: new Date(t.startDate || t.dueDate), end: new Date(t.dueDate || t.startDate) })),
    [tasks]
  );

  const { rangeStart, totalDays } = useMemo(() => {
    if (scheduled.length === 0) return { rangeStart: new Date(), rangeEnd: addDays(new Date(), 14), totalDays: 14 };
    const starts = scheduled.map((t) => t.start);
    const ends = scheduled.map((t) => t.end);
    const rs = min(starts);
    const re = addDays(max(ends), 2);
    return { rangeStart: rs, rangeEnd: re, totalDays: Math.max(1, differenceInCalendarDays(re, rs)) };
  }, [scheduled]);

  const taskId = params.get('taskId');

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (scheduled.length === 0) {
    return <EmptyState icon={GanttChartSquare} title="No scheduled tasks" description="Add a start or due date to tasks to see them on the timeline." />;
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${Math.max(700, totalDays * 28)}px` }}>
        <div className="space-y-1.5">
          {scheduled.map((t) => {
            const offsetDays = differenceInCalendarDays(t.start, rangeStart);
            const durationDays = Math.max(1, differenceInCalendarDays(t.end, t.start) + 1);
            const leftPct = (offsetDays / totalDays) * 100;
            const widthPct = (durationDays / totalDays) * 100;
            return (
              <div key={t._id} className="flex items-center">
                <button
                  onClick={() => setParams({ taskId: t._id })}
                  className="w-48 shrink-0 truncate pr-3 text-left text-sm text-ink hover:text-signal-dim"
                >
                  {t.title}
                </button>
                <div className="relative h-6 flex-1 rounded bg-paper">
                  <div
                    className={`absolute top-0.5 h-5 rounded-full ${PRIORITY_COLOR[t.priority]} ${t.status === 'DONE' ? 'opacity-50' : ''}`}
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
                    title={`${t.title}: ${format(t.start, 'MMM d')} - ${format(t.end, 'MMM d')}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {taskId && <TaskDrawer projectId={project._id} taskId={taskId} myRole={myRole} onClose={() => setParams({})} />}
    </div>
  );
}
