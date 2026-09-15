import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import { invitationsApi } from '../lib/resources';
import { Card } from '../components/ui/Display';
import { EmptyState, Skeleton } from '../components/ui/Overlay';
import Button from '../components/ui/Button';

export default function InvitationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inlineToken = params.get('token');
  const [busyId, setBusyId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invitations-mine'],
    queryFn: () => invitationsApi.listMine().then((r) => r.data.data.invitations),
  });

  const accept = async (inv) => {
    setBusyId(inv._id);
    try {
      const token = inv._id === params.get('id') ? inlineToken : window.prompt('Paste the invitation token from your email/link:');
      if (!token) return;
      const { data: res } = await invitationsApi.accept(inv._id, token);
      toast.success(`Joined ${inv.projectId.name}`);
      qc.invalidateQueries({ queryKey: ['invitations-mine'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${res.data.projectId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept invitation');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (inv) => {
    setBusyId(inv._id);
    try {
      await invitationsApi.reject(inv._id);
      qc.invalidateQueries({ queryKey: ['invitations-mine'] });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">Invitations</h1>
      <p className="mt-1 text-sm text-ink-muted">Projects other people have invited you to join.</p>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data.length === 0 ? (
          <EmptyState icon={Mail} title="No pending invitations" description="When someone invites you to a project, it'll show up here." />
        ) : (
          <Card className="divide-y divide-line">
            {data.map((inv) => (
              <div key={inv._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{inv.projectId.name}</p>
                  <p className="text-xs text-ink-muted">
                    {inv.invitedBy?.name} invited you as {inv.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => reject(inv)} disabled={busyId === inv._id}>
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => accept(inv)} disabled={busyId === inv._id}>
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
