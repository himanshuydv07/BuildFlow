import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { membersApi, invitationsApi } from '../../lib/resources';
import { Card, Avatar, RoleBadge } from '../../components/ui/Display';
import { Modal, ConfirmDialog } from '../../components/ui/Overlay';
import { FormField, Input, Select } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function ProjectTeamPage() {
  const { project, myRole } = useOutletContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ['OWNER', 'ADMIN'].includes(myRole);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' });
  const [removeTarget, setRemoveTarget] = useState(null);

  const { data: members } = useQuery({
    queryKey: ['members', project._id],
    queryFn: () => membersApi.list(project._id).then((r) => r.data.data.members),
  });
  const { data: pending } = useQuery({
    queryKey: ['invitations', project._id],
    queryFn: () => invitationsApi.listForProject(project._id).then((r) => r.data.data.invitations),
    enabled: canManage,
  });

  const inviteMutation = useMutation({
    mutationFn: () => invitationsApi.create(project._id, inviteForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invitations', project._id] });
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'MEMBER' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not send invitation'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }) => membersApi.updateRole(project._id, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', project._id] });
      toast.success('Role updated');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not update role'),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId) => membersApi.remove(project._id, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', project._id] });
      toast.success('Member removed');
      setRemoveTarget(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not remove member'),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id) => invitationsApi.cancel(project._id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations', project._id] }),
  });

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={15} /> Invite member
          </Button>
        </div>
      )}

      <Card className="divide-y divide-line">
        {(members || []).map((m) => {
          const isSelf = m.userId._id === user._id;
          const canEditThis = canManage && !isSelf && m.role !== 'OWNER' && (myRole === 'OWNER' || m.role !== 'ADMIN');
          return (
            <div key={m._id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.userId.name} size={8} />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {m.userId.name} {isSelf && <span className="text-ink-faint">(you)</span>}
                  </p>
                  <p className="text-xs text-ink-muted">{m.userId.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canEditThis ? (
                  <Select
                    value={m.role}
                    onChange={(e) => roleMutation.mutate({ memberId: m._id, role: e.target.value })}
                    className="w-32 py-1 text-xs"
                  >
                    {['ADMIN', 'MEMBER', 'VIEWER'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <RoleBadge role={m.role} />
                )}
                {canEditThis && (
                  <button onClick={() => setRemoveTarget(m)} className="rounded p-1 text-ink-faint hover:bg-coral-faint hover:text-coral">
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {canManage && pending?.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink">Pending invitations</h2>
          <Card className="divide-y divide-line">
            {pending.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-ink">
                  {inv.email} <span className="text-ink-faint">— invited as {inv.role}</span>
                </span>
                <button onClick={() => cancelInviteMutation.mutate(inv._id)} className="text-xs font-medium text-coral hover:underline">
                  Cancel
                </button>
              </div>
            ))}
          </Card>
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a teammate">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            inviteMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Email">
            <Input type="email" required autoFocus value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} placeholder="teammate@company.com" />
          </FormField>
          <FormField label="Role">
            <Select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="MEMBER">Member — can update assigned tasks, comment</option>
              <option value="VIEWER">Viewer — read-only</option>
              {myRole === 'OWNER' && <option value="ADMIN">Admin — manages tasks &amp; members</option>}
            </Select>
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={inviteMutation.isPending}>
              Send invitation
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeMutation.mutate(removeTarget._id)}
        title="Remove member"
        description={`Remove ${removeTarget?.userId.name} from ${project.name}? They will lose all access immediately.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
