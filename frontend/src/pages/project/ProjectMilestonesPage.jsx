import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Flag } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { milestonesApi } from '../../lib/resources';
import { Card, ProgressBar, Badge } from '../../components/ui/Display';
import { Modal, EmptyState, Skeleton } from '../../components/ui/Overlay';
import { FormField, Input, Textarea } from '../../components/ui/Form';
import Button from '../../components/ui/Button';

const STATUS_TONE = { UPCOMING: 'neutral', IN_PROGRESS: 'indigo', COMPLETED: 'signal', DELAYED: 'coral' };

export default function ProjectMilestonesPage() {
  const { project, myRole } = useOutletContext();
  const canManage = ['OWNER', 'ADMIN'].includes(myRole);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', dueDate: '' });
  const qc = useQueryClient();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['milestones', project._id],
    queryFn: () => milestonesApi.list(project._id).then((r) => r.data.data.milestones),
  });

  const createMutation = useMutation({
    mutationFn: () => milestonesApi.create(project._id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', project._id] });
      toast.success('Milestone created');
      setOpen(false);
      setForm({ name: '', description: '', dueDate: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not create milestone'),
  });

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} /> New milestone
          </Button>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : milestones.length === 0 ? (
        <EmptyState icon={Flag} title="No milestones yet" description="Milestones group tasks toward a shared deadline." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {milestones.map((m) => (
            <Card key={m._id} className="p-4">
              <div className="flex items-start justify-between">
                <p className="font-semibold text-ink">{m.name}</p>
                <Badge tone={STATUS_TONE[m.status]}>{m.status.replace('_', ' ')}</Badge>
              </div>
              {m.description && <p className="mt-1 text-sm text-ink-muted">{m.description}</p>}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-ink-muted">
                  <span>{m.dueDate ? `Due ${format(new Date(m.dueDate), 'MMM d, yyyy')}` : 'No due date'}</span>
                  <span className="tabular">{m.progress}%</span>
                </div>
                <ProgressBar value={m.progress} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New milestone">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Name">
            <Input required autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Description (optional)">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="Due date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create milestone
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
