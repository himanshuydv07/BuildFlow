import { useState, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksApi } from '../../lib/resources';
import { PriorityBadge, Avatar } from '../../components/ui/Display';
import { Skeleton } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';
import CreateTaskModal from '../../components/tasks/CreateTaskModal';
import TaskDrawer from '../../components/tasks/TaskDrawer';

const COLUMNS = [
  { key: 'TODO', label: 'To do' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'REVIEW', label: 'Review' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'DONE', label: 'Done' },
];

export default function ProjectKanbanPage() {
  const { project, myRole } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();
  const canCreate = ['OWNER', 'ADMIN'].includes(myRole);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', project._id, 'kanban'],
    queryFn: () => tasksApi.list(project._id, { limit: 100 }).then((r) => r.data.data.tasks),
  });

  const byColumn = useMemo(() => {
    const grouped = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    (tasks || []).forEach((t) => grouped[t.status]?.push(t));
    return grouped;
  }, [tasks]);

  const moveMutation = useMutation({
    mutationFn: ({ taskId, status }) => tasksApi.updateStatus(project._id, taskId, status),
    onError: (e) => {
      toast.error(e.response?.data?.message || 'You do not have permission to move this task');
      qc.invalidateQueries({ queryKey: ['tasks', project._id, 'kanban'] });
    },
  });

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    // Optimistic local update, then persist. Reverted via query
    // invalidation in the mutation's onError if the server rejects it.
    qc.setQueryData(['tasks', project._id, 'kanban'], (old) =>
      old.map((t) => (t._id === draggableId ? { ...t, status: destination.droppableId } : t))
    );
    moveMutation.mutate({ taskId: draggableId, status: destination.droppableId });
  };

  const taskId = params.get('taskId');

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map((c) => (
          <Skeleton key={c.key} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> New task
          </Button>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-4">
          {COLUMNS.map((col) => (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex min-h-[200px] flex-col gap-2 rounded-md border border-line bg-paper p-2.5 ${
                    snapshot.isDraggingOver ? 'ring-2 ring-signal' : ''
                  }`}
                >
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-xs font-semibold text-ink-muted">{col.label}</span>
                    <span className="tabular text-xs text-ink-faint">{byColumn[col.key].length}</span>
                  </div>
                  {byColumn[col.key].map((t, i) => (
                    <Draggable draggableId={t._id} index={i} key={t._id}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => setParams({ taskId: t._id })}
                          className={`cursor-pointer rounded-md border border-line bg-white p-3 shadow-card ${
                            dragSnapshot.isDragging ? 'shadow-pop' : ''
                          }`}
                        >
                          <p className="text-sm font-medium text-ink">{t.title}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <PriorityBadge priority={t.priority} />
                            {t.assignee && <Avatar name={t.assignee.name} size={6} />}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <CreateTaskModal projectId={project._id} open={createOpen} onClose={() => setCreateOpen(false)} />
      {taskId && <TaskDrawer projectId={project._id} taskId={taskId} myRole={myRole} onClose={() => setParams({})} />}
    </div>
  );
}
