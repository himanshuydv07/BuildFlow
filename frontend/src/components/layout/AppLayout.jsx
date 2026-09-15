import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Modal } from '../ui/Overlay';
import { FormField, Input, Textarea, Select } from '../ui/Form';
import Button from '../ui/Button';
import { projectsApi, templatesApi } from '../../lib/resources';

const ICONS = ['📁', '🚀', '🎯', '📊', '🛠️', '🎨', '📱', '🌱'];

export default function AppLayout() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '📁', templateKey: 'BLANK' });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data.data.templates),
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create({ ...form, templateKey: form.templateKey === 'BLANK' ? undefined : form.templateKey }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      setModalOpen(false);
      setForm({ name: '', description: '', icon: '📁', templateKey: 'BLANK' });
      navigate(`/projects/${data.data.project._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not create project'),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <Sidebar onCreateProject={() => setModalOpen(true)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <FormField label="Icon">
            <div className="flex gap-1.5">
              {ICONS.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg ${
                    form.icon === icon ? 'border-signal bg-signal-faint' : 'border-line hover:bg-paper'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Project name">
            <Input
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Website Redesign"
            />
          </FormField>
          <FormField label="Description (optional)">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about?"
            />
          </FormField>
          <FormField label="Start from a template">
            <Select value={form.templateKey} onChange={(e) => setForm((f) => ({ ...f, templateKey: e.target.value }))}>
              {(templates || [{ key: 'BLANK', label: 'Blank Project' }]).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
