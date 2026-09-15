import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../lib/resources';
import { Input, FormField } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import AuthShell from './AuthShell';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword({ uid: params.get('uid'), token: params.get('token'), newPassword: password });
      toast.success('Password reset. Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset link is invalid or expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="New password">
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </FormField>
        <Button type="submit" className="w-full" loading={loading}>
          Reset password
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-semibold text-signal-dim hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
