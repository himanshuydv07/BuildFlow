import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StickyNote, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { notesApi } from '../lib/resources';
import { Card } from '../components/ui/Display';
import { Modal, EmptyState, Skeleton } from '../components/ui/Overlay';
import { FormField, Input, Textarea } from '../components/ui/Form';
import Button from '../components/ui/Button';

export default function NotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const { data: notes, isLoading } = useQuery({
    queryKey: ['personal-notes'],
    queryFn: () => notesApi.listPersonal().then((r) => r.data.data.notes),
  });

  const createMutation = useMutation({
    mutationFn: () => notesApi.createPersonal(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-notes'] });
      toast.success('Note added');
      setOpen(false);
      setForm({ title: '', content: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personal-notes'] }),
  });

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">My Notes</h1>
          <p className="mt-1 text-sm text-ink-muted">Personal notes only you can see.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={15} /> New note
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : notes.length === 0 ? (
          <EmptyState icon={StickyNote} title="No notes yet" description="Jot down anything — these are private to you." />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {notes.map((n) => (
              <Card key={n._id} className="p-4">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-ink">{n.title}</p>
                  <button onClick={() => deleteMutation.mutate(n._id)} className="text-ink-faint hover:text-coral">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-ink-muted">{n.content}</p>
                <p className="mt-3 text-xs text-ink-faint">{format(new Date(n.updatedAt), 'MMM d, yyyy')}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New note">
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
