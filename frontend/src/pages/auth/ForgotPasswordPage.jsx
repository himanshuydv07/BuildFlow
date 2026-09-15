import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../lib/resources';
import { Input, FormField } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import AuthShell from './AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="We'll send a reset link if that email is registered.">
      {sent ? (
        <p className="rounded-md bg-signal-faint p-4 text-sm text-signal-dim">
          If <strong>{email}</strong> is registered, a reset link is on its way. Check your inbox (or the server console in local dev).
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <FormField label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </FormField>
          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link to="/login" className="font-semibold text-signal-dim hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}
