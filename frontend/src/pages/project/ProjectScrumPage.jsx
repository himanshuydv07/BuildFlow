import { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Layers } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { tasksApi, sprintsApi } from '../../lib/resources';
import { Card, StatusBadge, Avatar, Badge } from '../../components/ui/Display';
import { Modal, EmptyState, Skeleton } from '../../components/ui/Overlay';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import CreateTaskModal from '../../components/tasks/CreateTaskModal';
import TaskDrawer from '../../components/tasks/TaskDrawer';

export default function ProjectScrumPage() {
  const { project, myRole } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const canManage = ['OWNER', 'ADMIN'].includes(myRole);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '', startDate: '', endDate: '' });
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [activeSprintId, setActiveSprintId] = useState(null);
  const qc = useQueryClient();

  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ['sprints', project._id],
    queryFn: () => sprintsApi.list(project._id).then((r) => r.data.data.sprints),
  });

  const { data: backlog, isLoading: backlogLoading } = useQuery({
    queryKey: ['tasks', project._id, 'backlog'],
    queryFn: () => tasksApi.list(project._id, { isBacklog: true, limit: 100 }).then((r) => r.data.data.tasks),
  });

  const { data: board } = useQuery({
    queryKey: ['sprint-board', project._id, activeSprintId],
    queryFn: () => sprintsApi.board(project._id, activeSprintId).then((r) => r.data.data),
    enabled: !!activeSprintId,
  });

  const createSprintMutation = useMutation({
    mutationFn: () => sprintsApi.create(project._id, sprintForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints', project._id] });
      toast.success('Sprint created');
      setSprintModalOpen(false);
      setSprintForm({ name: '', goal: '', startDate: '', endDate: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not create sprint'),
  });

  const assignToSprint = useMutation({
    mutationFn: ({ taskId, sprintId }) => tasksApi.update(project._id, taskId, { sprint: sprintId, isBacklog: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', project._id, 'backlog'] });
      qc.invalidateQueries({ queryKey: ['sprint-board', project._id, activeSprintId] });
    },
  });

  const taskId = params.get('taskId');
  const activeSprint = (sprints || []).find((s) => s._id === activeSprintId);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Sprints</h2>
          {canManage && (
            <button onClick={() => setSprintModalOpen(true)} className="text-ink-faint hover:text-signal-dim">
              <Plus size={16} />
            </button>
          )}
        </div>
        {sprintsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          (sprints || []).map((s) => (
            <button
              key={s._id}
              onClick={() => setActiveSprintId(s._id)}
              className={`block w-full rounded-md border p-3 text-left ${
                activeSprintId === s._id ? 'border-signal bg-signal-faint' : 'border-line bg-white hover:bg-paper'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <Badge tone={s.status === 'ACTIVE' ? 'signal' : 'neutral'}>{s.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {format(new Date(s.startDate), 'MMM d')} - {format(new Date(s.endDate), 'MMM d')}
              </p>
            </button>
          ))
        )}

        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Backlog</h2>
            {canManage && (
              <button onClick={() => setCreateTaskOpen(true)} className="text-ink-faint hover:text-signal-dim">
                <Plus size={16} />
              </button>
            )}
          </div>
          {backlogLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (backlog || []).length === 0 ? (
            <EmptyState icon={Layers} title="Backlog is empty" />
          ) : (
            <Card className="divide-y divide-line">
              {backlog.map((t) => (
                <div key={t._id} className="flex items-center justify-between px-3 py-2">
                  <button onClick={() => setParams({ taskId: t._id })} className="truncate text-left text-sm text-ink hover:text-signal-dim">
                    {t.title}
                  </button>
                  {activeSprintId && canManage && (
                    <button
                      onClick={() => assignToSprint.mutate({ taskId: t._id, sprintId: activeSprintId })}
                      className="shrink-0 text-xs font-medium text-signal-dim hover:underline"
                    >
                      Add to sprint
                    </button>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <div className="col-span-2">
        {!activeSprintId ? (
          <EmptyState icon={Layers} title="Select a sprint" description="Choose a sprint on the left to see its board and burndown." />
        ) : !board ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">{activeSprint?.name}</h2>
                  {activeSprint?.goal && <p className="text-sm text-ink-muted">{activeSprint.goal}</p>}
                </div>
                <p className="tabular text-sm text-ink-muted">
                  {board.donePoints}/{board.totalPoints} pts
                </p>
              </div>
              <ResponsiveContainer width="100%" height={200} className="mt-4">
                <LineChart data={board.burndown}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ideal" stroke="#949AA3" strokeDasharray="4 4" dot={false} name="Ideal" />
                  <Line type="monotone" dataKey="actualRemaining" stroke="#E1493F" strokeWidth={2} dot={false} name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="divide-y divide-line">
              {board.tasks.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setParams({ taskId: t._id })}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-paper"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <span className="text-sm text-ink">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.storyPoints && <span className="tabular text-xs text-ink-faint">{t.storyPoints} pts</span>}
                    {t.assignee && <Avatar name={t.assignee.name} size={6} />}
                  </div>
                </button>
              ))}
            </Card>
          </div>
        )}
      </div>

      <Modal open={sprintModalOpen} onClose={() => setSprintModalOpen(false)} title="New sprint">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSprintMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Name">
            <Input required value={sprintForm.name} onChange={(e) => setSprintForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sprint 1" />
          </FormField>
          <FormField label="Goal (optional)">
            <Textarea rows={2} value={sprintForm.goal} onChange={(e) => setSprintForm((f) => ({ ...f, goal: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start date">
              <Input type="date" required value={sprintForm.startDate} onChange={(e) => setSprintForm((f) => ({ ...f, startDate: e.target.value }))} />
            </FormField>
            <FormField label="End date">
              <Input type="date" required value={sprintForm.endDate} onChange={(e) => setSprintForm((f) => ({ ...f, endDate: e.target.value }))} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSprintModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createSprintMutation.isPending}>
              Create sprint
            </Button>
          </div>
        </form>
      </Modal>

      <CreateTaskModal projectId={project._id} open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} defaultFields={{ isBacklog: true }} />
      {taskId && <TaskDrawer projectId={project._id} taskId={taskId} myRole={myRole} onClose={() => setParams({})} />}
    </div>
  );
}
