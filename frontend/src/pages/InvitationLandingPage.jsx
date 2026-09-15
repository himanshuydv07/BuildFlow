import { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { invitationsApi } from '../lib/resources';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Display';

export default function InvitationLandingPage() {
  const { invitationId } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const accept = async () => {
    setStatus('loading');
    try {
      const { data } = await invitationsApi.accept(invitationId, token);
      setStatus('done');
      setTimeout(() => navigate(`/projects/${data.data.projectId}`), 800);
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.message || 'Could not accept invitation');
    }
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <Card className="max-w-sm p-6 text-center">
          <p className="text-sm text-ink-muted">Log in with the email this invitation was sent to, then come back to this link.</p>
          <Link to="/login" state={{ from: `/invitations/${invitationId}?token=${token}` }}>
            <Button className="mt-4 w-full">Log in</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-paper">
      <Card className="max-w-sm p-6 text-center">
        {status === 'done' ? (
          <p className="text-sm text-signal-dim">Joined! Redirecting…</p>
        ) : status === 'error' ? (
          <p className="text-sm text-coral">{error}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-muted">You've been invited to join a project.</p>
            <Button className="w-full" loading={status === 'loading'} onClick={accept}>
              Accept invitation
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}