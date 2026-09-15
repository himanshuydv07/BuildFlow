import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tasksApi, membersApi } from '../../lib/resources';
import { Modal } from '../ui/Overlay';
import { FormField, Input, Textarea, Select } from '../ui/Form';
import Button from '../ui/Button';

export default function CreateTaskModal({ projectId, open, onClose, defaultFields = {} }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assignee: '', dueDate: '' });
  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => membersApi.list(projectId).then((r) => r.data.data.members),
  });

  const mutation = useMutation({
    mutationFn: () =>
      tasksApi.create(projectId, {
        ...form,
        ...defaultFields,
        assignee: form.assignee || undefined,
        dueDate: form.dueDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      toast.success('Task created');
      setForm({ title: '', description: '', priority: 'MEDIUM', assignee: '', dueDate: '' });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not create task'),
  });

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <FormField label="Title">
          <Input required autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" />
        </FormField>
        <FormField label="Description (optional)">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priority">
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assignee">
            <Select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}>
              <option value="">Unassigned</option>
              {(members || []).map((m) => (
                <option key={m._id} value={m.userId._id}>
                  {m.userId.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Due date (optional)">
          <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </FormField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Create task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
