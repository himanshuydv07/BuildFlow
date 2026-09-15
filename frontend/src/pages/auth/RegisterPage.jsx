import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Input, FormField } from '../../components/ui/Form';
import Button from '../../components/ui/Button';
import AuthShell from './AuthShell';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const fieldErrors = {};
      (err.response?.data?.errors || []).forEach((er) => {
        fieldErrors[er.field] = er.message;
      });
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your workspace" subtitle="Own your projects. Join others' as a teammate.">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Full name" error={errors.name}>
          <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Priya Patel" />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" />
        </FormField>
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-signal-dim hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
