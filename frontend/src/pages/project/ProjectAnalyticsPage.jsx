import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { analyticsApi } from '../../lib/resources';
import api from '../../lib/apiClient';
import { Card } from '../../components/ui/Display';
import { Skeleton } from '../../components/ui/Overlay';
import Button from '../../components/ui/Button';

const PRIORITY_COLORS = { LOW: '#949AA3', MEDIUM: '#6C63D6', HIGH: '#DB9A1F', CRITICAL: '#E1493F' };
const STATUS_COLORS = { TODO: '#949AA3', IN_PROGRESS: '#6C63D6', REVIEW: '#DB9A1F', BLOCKED: '#E1493F', DONE: '#0F9D74' };

export default function ProjectAnalyticsPage() {
  const { project } = useOutletContext();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', project._id],
    queryFn: () => analyticsApi.get(project._id).then((r) => r.data.data),
  });

  const downloadCsv = async () => {
    const res = await api.get(`/projects/${project._id}/reports/export.csv`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-tasks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const priorityData = Object.entries(data.priorityDistribution).map(([name, value]) => ({ name, value }));
  const statusData = Object.entries(data.statusDistribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={downloadCsv}>
          <Download size={14} /> Export tasks (CSV)
        </Button>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">Completion trend (last 8 weeks)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.completionTrend}>
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#0F9D74" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Tasks by status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80}>
                {statusData.map((d) => (
                  <Cell key={d.name} fill={STATUS_COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Priority distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {priorityData.map((d) => (
                  <Cell key={d.name} fill={PRIORITY_COLORS[d.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">Team workload (open tasks)</h2>
        <div className="space-y-2">
          {data.workload.map((w) => (
            <div key={w.userId} className="flex items-center gap-3">
              <span className="w-28 truncate text-sm text-ink">{w.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-indigo"
                  style={{ width: `${Math.min(100, w.openTasks * 12)}%` }}
                />
              </div>
              <span className="tabular w-6 text-right text-xs text-ink-muted">{w.openTasks}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
