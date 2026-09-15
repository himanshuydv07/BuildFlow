import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Clock, Play, Square, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { tasksApi, commentsApi, membersApi } from '../../lib/resources';
import { Select } from '../ui/Form';
import { StatusBadge, PriorityBadge, Avatar, ProgressBar } from '../ui/Display';
import { Skeleton } from '../ui/Overlay';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TaskDrawer({ projectId, taskId, myRole, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [checklistText, setChecklistText] = useState('');
  const [commentText, setCommentText] = useState('');
  const canManage = ['OWNER', 'ADMIN'].includes(myRole);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', projectId, taskId],
    queryFn: () => tasksApi.get(projectId, taskId).then((r) => r.data.data.task),
    enabled: !!taskId,
  });
  const { data: comments } = useQuery({
    queryKey: ['comments', projectId, taskId],
    queryFn: () => commentsApi.list(projectId, taskId).then((r) => r.data.data.comments),
    enabled: !!taskId,
  });
  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => membersApi.list(projectId).then((r) => r.data.data.members),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['task', projectId, taskId] });
    qc.invalidateQueries({ queryKey: ['tasks', projectId] });
  };

  const canEditFully = canManage;
  const isAssignee = task?.assignee?._id === user?._id;
  const canUpdateProgress = canManage || isAssignee;

  const statusMutation = useMutation({
    mutationFn: (status) => tasksApi.updateStatus(projectId, taskId, status),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.response?.data?.message || 'Could not update status'),
  });
  const assignMutation = useMutation({
    mutationFn: (assignee) => tasksApi.update(projectId, taskId, { assignee: assignee || null }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.response?.data?.message || 'Could not reassign'),
  });
  const priorityMutation = useMutation({
    mutationFn: (priority) => tasksApi.update(projectId, taskId, { priority }),
    onSuccess: invalidate,
  });
  const checklistAdd = useMutation({
    mutationFn: (text) => tasksApi.addChecklistItem(projectId, taskId, text),
    onSuccess: () => {
      setChecklistText('');
      invalidate();
    },
  });
  const checklistToggle = useMutation({
    mutationFn: ({ itemId, done }) => tasksApi.toggleChecklistItem(projectId, taskId, itemId, done),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.remove(projectId, taskId),
    onSuccess: () => {
      toast.success('Task deleted');
      invalidate();
      onClose();
    },
  });
  const commentMutation = useMutation({
    mutationFn: (content) => commentsApi.create(projectId, taskId, { content }),
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['comments', projectId, taskId] });
    },
  });
  const timerStartMutation = useMutation({
    mutationFn: () => tasksApi.startTimer(projectId, taskId),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.response?.data?.message || 'Could not start timer'),
  });
  const timerStopMutation = useMutation({
    mutationFn: () => tasksApi.stopTimer(projectId, taskId),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.response?.data?.message || 'Could not stop timer'),
  });
  const addDependency = useMutation({
    mutationFn: (depId) => tasksApi.update(projectId, taskId, { dependsOn: [...(task.dependsOn || []).map((d) => d._id), depId] }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e.response?.data?.message || 'Could not add dependency'),
  });
  const removeDependency = useMutation({
    mutationFn: (depId) =>
      tasksApi.update(projectId, taskId, { dependsOn: (task.dependsOn || []).map((d) => d._id).filter((id) => id !== depId) }),
    onSuccess: invalidate,
  });
  const { data: allTasks } = useQuery({
    queryKey: ['tasks', projectId, 'for-deps'],
    queryFn: () => tasksApi.list(projectId, { limit: 100 }).then((r) => r.data.data.tasks),
  });

  if (!taskId) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30">
      <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-pop">
        {isLoading || !task ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-line px-6 py-4">
              <div>
                <StatusBadge status={task.status} />
                <h2 className="mt-2 text-lg font-bold text-ink">{task.title}</h2>
              </div>
              <div className="flex items-center gap-1">
                {canManage && (
                  <button onClick={() => deleteMutation.mutate()} className="rounded p-1.5 text-ink-faint hover:bg-coral-faint hover:text-coral" aria-label="Delete task">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={onClose} className="rounded p-1.5 text-ink-faint hover:bg-paper" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 px-6 py-5">
              {task.description && <p className="text-sm text-ink-muted">{task.description}</p>}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <Select
                    value={task.status}
                    disabled={!canUpdateProgress}
                    onChange={(e) => statusMutation.mutate(e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={task.priority} disabled={!canEditFully} onChange={(e) => priorityMutation.mutate(e.target.value)}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Assignee">
                  <Select value={task.assignee?._id || ''} disabled={!canEditFully} onChange={(e) => assignMutation.mutate(e.target.value)}>
                    <option value="">Unassigned</option>
                    {(members || []).map((m) => (
                      <option key={m._id} value={m.userId._id}>
                        {m.userId.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Due date">
                  <p className="pt-2 text-sm text-ink">{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}</p>
                </Field>
              </div>

              <div>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-ink">Progress</span>
                  <span className="tabular text-ink-muted">{task.progress}%</span>
                </div>
                <ProgressBar value={task.progress} tone={task.status === 'BLOCKED' ? 'coral' : 'signal'} />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">Checklist</h3>
                <div className="space-y-1.5">
                  {(task.checklist || []).map((item) => (
                    <label key={item._id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={!canUpdateProgress}
                        onChange={(e) => checklistToggle.mutate({ itemId: item._id, done: e.target.checked })}
                        className="h-4 w-4 rounded border-line text-signal focus:ring-signal"
                      />
                      <span className={item.done ? 'text-ink-faint line-through' : 'text-ink'}>{item.text}</span>
                    </label>
                  ))}
                </div>
                {canUpdateProgress && (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (checklistText.trim()) checklistAdd.mutate(checklistText.trim());
                    }}
                  >
                    <input
                      value={checklistText}
                      onChange={(e) => setChecklistText(e.target.value)}
                      placeholder="Add a checklist item"
                      className="flex-1 rounded-md border border-line px-3 py-1.5 text-sm focus:border-signal focus:outline-none"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      <Plus size={14} />
                    </Button>
                  </form>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">Dependencies</h3>
                <div className="space-y-1.5">
                  {(task.dependsOn || []).map((dep) => (
                    <div key={dep._id} className="flex items-center justify-between rounded-md border border-line px-2.5 py-1.5 text-sm">
                      <span className="flex items-center gap-1.5 text-ink">
                        <Link2 size={13} className="text-ink-faint" /> {dep.title}
                        <StatusBadge status={dep.status} />
                      </span>
                      {canEditFully && (
                        <button onClick={() => removeDependency.mutate(dep._id)} className="text-ink-faint hover:text-coral">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(task.dependsOn || []).length === 0 && <p className="text-sm text-ink-faint">No dependencies.</p>}
                </div>
                {canEditFully && (
                  <Select
                    className="mt-2"
                    value=""
                    onChange={(e) => e.target.value && addDependency.mutate(e.target.value)}
                  >
                    <option value="">+ Add dependency…</option>
                    {(allTasks || [])
                      .filter((t) => t._id !== task._id && !(task.dependsOn || []).some((d) => d._id === t._id))
                      .map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.title}
                        </option>
                      ))}
                  </Select>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-ink">Comments</h3>
                <div className="space-y-3">
                  {(comments || []).map((c) => (
                    <div key={c._id} className="flex gap-2.5">
                      <Avatar name={c.author?.name} size={7} />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium text-ink">{c.author?.name}</span>{' '}
                          <span className="text-xs text-ink-faint">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                        </p>
                        <p className="text-sm text-ink-muted">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {myRole !== 'VIEWER' && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (commentText.trim()) commentMutation.mutate(commentText.trim());
                    }}
                  >
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment…"
                      className="flex-1 rounded-md border border-line px-3 py-1.5 text-sm focus:border-signal focus:outline-none"
                    />
                    <Button type="submit" size="sm">
                      Post
                    </Button>
                  </form>
                )}
              </div>

              <div className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                  <Clock size={12} /> {(task.loggedHours || 0).toFixed(2)}h logged {task.estimatedHours ? `of ${task.estimatedHours}h estimated` : ''}
                </span>
                {canUpdateProgress &&
                  (task.timerStartedAt ? (
                    <Button size="sm" variant="danger" onClick={() => timerStopMutation.mutate()} loading={timerStopMutation.isPending}>
                      <Square size={12} /> Stop timer
                    </Button>
                  ) : (
                    <Button size="sm" variant="subtle" onClick={() => timerStartMutation.mutate()} loading={timerStartMutation.isPending}>
                      <Play size={12} /> Start timer
                    </Button>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-ink-muted">{label}</p>
      {children}
    </div>
  );
}
