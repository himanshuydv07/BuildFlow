import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StickyNote, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { notesApi } from '../../lib/resources';
import { Card, Avatar } from '../../components/ui/Display';
import { Modal, EmptyState, Skeleton } from '../../components/ui/Overlay';
import { FormField, Input, Textarea } from '../../components/ui/Form';
import Button from '../../components/ui/Button';

export default function ProjectNotesPage() {
  const { project, myRole } = useOutletContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const { data: notes, isLoading } = useQuery({
    queryKey: ['project-notes', project._id],
    queryFn: () => notesApi.listProject(project._id).then((r) => r.data.data.notes),
  });

  const createMutation = useMutation({
    mutationFn: () => notesApi.createProject(project._id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-notes', project._id] });
      toast.success('Note added');
      setOpen(false);
      setForm({ title: '', content: '' });
    },
  });

  return (
    <div>
      {myRole !== 'VIEWER' && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} /> New note
          </Button>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No project notes yet" description="Shared notes visible to everyone on this project." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {notes.map((n) => (
            <Card key={n._id} className="p-4">
              <p className="font-semibold text-ink">{n.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{n.content}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                <Avatar name={n.author?.name} size={5} />
                {n.author?.name} · {format(new Date(n.updatedAt), 'MMM d, yyyy')}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New project note">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Title">
            <Input required autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </FormField>
          <FormField label="Content">
            <Textarea rows={6} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Save note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
