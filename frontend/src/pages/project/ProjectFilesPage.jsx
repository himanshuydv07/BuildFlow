import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, File as FileIcon, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { filesApi } from '../../lib/resources';
import api from '../../lib/apiClient';
import { Card, Badge } from '../../components/ui/Display';
import { EmptyState, Skeleton } from '../../components/ui/Overlay';
import { Select } from '../../components/ui/Form';
import Button from '../../components/ui/Button';

const CATEGORIES = ['REQUIREMENTS', 'DESIGN', 'DEVELOPMENT', 'REPORTS', 'OTHER'];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectFilesPage() {
  const { project, myRole } = useOutletContext();
  const [category, setCategory] = useState('');
  const [uploadCategory, setUploadCategory] = useState('OTHER');
  const fileInput = useRef(null);
  const qc = useQueryClient();

  const { data: files, isLoading } = useQuery({
    queryKey: ['files', project._id, category],
    queryFn: () => filesApi.list(project._id, category ? { category } : {}).then((r) => r.data.data.files),
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);
      return filesApi.upload(project._id, formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', project._id] });
      toast.success('File uploaded');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Upload failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId) => filesApi.remove(project._id, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', project._id] });
      toast.success('File removed');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not delete file'),
  });

  const download = async (file) => {
    const res = await api.get(`/projects/${project._id}/files/${file._id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canDelete = ['OWNER', 'ADMIN'].includes(myRole);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {myRole !== 'VIEWER' && (
          <div className="flex items-center gap-2">
            <Select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="w-40">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files[0] && uploadMutation.mutate(e.target.files[0])}
            />
            <Button onClick={() => fileInput.current.click()} loading={uploadMutation.isPending}>
              <Upload size={15} /> Upload file
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : files.length === 0 ? (
        <EmptyState icon={FileIcon} title="No files yet" description="Requirements, designs, and reports uploaded here are organized by category." />
      ) : (
        <Card className="divide-y divide-line">
          {files.map((f) => (
            <div key={f._id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <FileIcon size={18} className="text-ink-faint" />
                <div>
                  <p className="text-sm font-medium text-ink">{f.originalName}</p>
                  <p className="text-xs text-ink-muted">
                    {formatSize(f.size)} · {f.uploadedBy?.name} · {format(new Date(f.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{f.category}</Badge>
                <button onClick={() => download(f)} className="rounded p-1.5 text-ink-faint hover:bg-paper hover:text-ink" aria-label="Download">
                  <Download size={15} />
                </button>
                {canDelete && (
                  <button
                    onClick={() => deleteMutation.mutate(f._id)}
                    className="rounded p-1.5 text-ink-faint hover:bg-coral-faint hover:text-coral"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
