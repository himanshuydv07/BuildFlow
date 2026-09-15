import { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { tasksApi, milestonesApi } from '../../lib/resources';
import TaskDrawer from '../../components/tasks/TaskDrawer';

export default function ProjectCalendarPage() {
  const { project, myRole } = useOutletContext();
  const [month, setMonth] = useState(new Date());
  const [params, setParams] = useSearchParams();

  const { data: tasks } = useQuery({
    queryKey: ['tasks', project._id, 'all-for-calendar'],
    queryFn: () => tasksApi.list(project._id, { limit: 100 }).then((r) => r.data.data.tasks),
  });
  const { data: milestones } = useQuery({
    queryKey: ['milestones', project._id],
    queryFn: () => milestonesApi.list(project._id).then((r) => r.data.data.milestones),
  });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = {};
    (tasks || []).forEach((t) => {
      if (!t.dueDate) return;
      const key = format(new Date(t.dueDate), 'yyyy-MM-dd');
      (map[key] ||= []).push({ kind: 'task', ...t });
    });
    (milestones || []).forEach((m) => {
      if (!m.dueDate) return;
      const key = format(new Date(m.dueDate), 'yyyy-MM-dd');
      (map[key] ||= []).push({ kind: 'milestone', ...m });
    });
    return map;
  }, [tasks, milestones]);

  const taskId = params.get('taskId');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="rounded-md border border-line p-1.5 hover:bg-paper">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setMonth(new Date())} className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-paper">
            Today
          </button>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="rounded-md border border-line p-1.5 hover:bg-paper">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-md border border-line">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="border-b border-line bg-paper px-2 py-1.5 text-center text-xs font-semibold text-ink-muted">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const events = eventsByDay[key] || [];
          return (
            <div
              key={key}
              className={`min-h-[100px] border-b border-r border-line p-1.5 last:border-r-0 ${
                !isSameMonth(day, month) ? 'bg-paper/60' : 'bg-white'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  isSameDay(day, new Date()) ? 'bg-signal font-bold text-white' : 'text-ink-muted'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {events.slice(0, 3).map((e, i) =>
                  e.kind === 'milestone' ? (
                    <div key={i} className="truncate rounded-sm bg-indigo-faint px-1.5 py-0.5 text-[11px] font-medium text-indigo">
                      🚩 {e.name}
                    </div>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setParams({ taskId: e._id })}
                      className="block w-full truncate rounded-sm bg-signal-faint px-1.5 py-0.5 text-left text-[11px] font-medium text-signal-dim hover:bg-signal/20"
                    >
                      {e.title}
                    </button>
                  )
                )}
                {events.length > 3 && <p className="text-[10px] text-ink-faint">+{events.length - 3} more</p>}
              </div>
            </div>
          );
        })}
      </div>

      {taskId && <TaskDrawer projectId={project._id} taskId={taskId} myRole={myRole} onClose={() => setParams({})} />}
    </div>
  );
}
