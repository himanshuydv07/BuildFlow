import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { milestonesApi, membersApi } from '../../lib/resources';
import { Card, ProgressBar, AvatarStack } from '../../components/ui/Display';

const STATUS_COLORS = { TODO: 'bg-line', IN_PROGRESS: 'bg-indigo', REVIEW: 'bg-amber', BLOCKED: 'bg-coral', DONE: 'bg-signal' };

export default function ProjectOverviewPage() {
  const { project, dashboard } = useOutletContext();
  const { data: milestones } = useQuery({
    queryKey: ['milestones', project._id],
    queryFn: () => milestonesApi.list(project._id).then((r) => r.data.data.milestones),
  });
  const { data: members } = useQuery({
    queryKey: ['members', project._id],
    queryFn: () => membersApi.list(project._id).then((r) => r.data.data.members),
  });

  if (!dashboard) return null;
  const { taskCounts, totalTasks, completionRate } = dashboard;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Task breakdown</h2>
            <span className="tabular text-sm font-semibold text-ink">{completionRate}% complete</span>
          </div>
          {totalTasks === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">No tasks yet — head to the Tasks tab to create the first one.</p>
          ) : (
            <>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-line">
                {Object.entries(taskCounts).map(([status, count]) =>
                  count > 0 ? <div key={status} className={STATUS_COLORS[status]} style={{ width: `${(count / totalTasks) * 100}%` }} /> : null
                )}
              </div>
              <div className="mt-4 grid grid-cols-5 gap-3">
                {Object.entries(taskCounts).map(([status, count]) => (
                  <div key={status}>
                    <p className="tabular text-lg font-bold text-ink">{count}</p>
                    <p className="text-xs text-ink-muted">{status.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Milestones</h2>
            <Link to="../milestones" className="text-xs font-medium text-signal-dim hover:underline">
              View all
            </Link>
          </div>
          {(milestones || []).length === 0 ? (
            <p className="text-sm text-ink-muted">No milestones yet.</p>
          ) : (
            <div className="space-y-3">
              {(milestones || []).slice(0, 4).map((m) => (
                <div key={m._id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-ink">{m.name}</span>
                    <span className="tabular text-ink-muted">{m.progress}%</span>
                  </div>
                  <ProgressBar value={m.progress} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Team</h2>
          <AvatarStack names={(members || []).map((m) => m.userId?.name)} />
          <p className="mt-3 text-xs text-ink-muted">{(members || []).length} active member(s)</p>
        </Card>
        <Card accent="coral" className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Overdue tasks</h2>
          <p className="tabular text-2xl font-bold text-coral">{dashboard.overdueCount}</p>
          <p className="mt-1 text-xs text-ink-muted">across this project</p>
        </Card>
      </div>
    </div>
  );
}
