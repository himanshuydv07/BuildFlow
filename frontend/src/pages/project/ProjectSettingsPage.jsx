import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectsApi, membersApi } from '../../lib/resources';
import { Card, Badge } from '../../components/ui/Display';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';

export default function ProjectSettingsPage() {
  const { project, myRole } = useOutletContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isOwner = myRole === 'OWNER';
  const [form, setForm] = useState({ name: project.name, description: project.description || '', status: project.status, priority: project.priority });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  const { data: members } = useQuery({
    queryKey: ['members', project._id],
    queryFn: () => membersApi.list(project._id).then((r) => r.data.data.members),
    enabled: transferOpen,
  });

  const updateMutation = useMutation({
    mutationFn: () => projectsApi.update(project._id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', project._id] });
      toast.success('Project updated');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not update project'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => projectsApi.archive(project._id),
    onSuccess: () => {
      toast.success('Project archived');
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate('/dashboard');
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => projectsApi.transferOwnership(project._id, newOwnerId),
    onSuccess: () => {
      toast.success('Ownership transferred');
      qc.invalidateQueries({ queryKey: ['project', project._id] });
      setTransferOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not transfer ownership'),
  });

  if (!isOwner && myRole !== 'ADMIN') {
    return <p className="text-sm text-ink-muted">Only project owners and admins can view settings.</p>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <Card className="p-5">
        <h2 className="font-display mb-4 text-base font-bold text-ink">Project details</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Description">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Status">
              <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'].map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <Button type="submit" loading={updateMutation.isPending}>
            Save changes
          </Button>
        </form>
      </Card>

      {isOwner && (
        <Card accent="coral" className="p-5">
          <h2 className="font-display mb-1 text-base font-bold text-ink">Danger zone</h2>
          <p className="mb-4 text-sm text-ink-muted">These actions are significant and cannot be easily undone.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setTransferOpen(true)}>
              Transfer ownership
            </Button>
            <Button variant="danger" onClick={() => setArchiveOpen(true)}>
              Archive project
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={() => archiveMutation.mutate()}
        title="Archive this project?"
        description={`"${project.name}" will be hidden from active views for everyone. This can be reversed by an administrator.`}
        confirmLabel="Archive"
        danger
      />

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer ownership">
        <p className="mb-4 text-sm text-ink-muted">
          Choose an existing active member to become the new Owner. You will become an Admin.
        </p>
        <Select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
          <option value="">Select a member…</option>
          {(members || [])
            .filter((m) => m.role !== 'OWNER')
            .map((m) => (
              <option key={m._id} value={m.userId._id}>
                {m.userId.name} ({m.role})
              </option>
            ))}
        </Select>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTransferOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!newOwnerId} loading={transferMutation.isPending} onClick={() => transferMutation.mutate()}>
            Transfer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
