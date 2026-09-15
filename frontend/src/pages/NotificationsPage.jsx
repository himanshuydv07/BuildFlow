import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../lib/resources';
import { Card } from '../components/ui/Display';
import { EmptyState, Skeleton } from '../components/ui/Overlay';
import Button from '../components/ui/Button';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'full'],
    queryFn: () => notificationsApi.list({ limit: 50 }).then((r) => r.data.data.notifications),
  });

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Notifications</h1>
        <Button variant="secondary" size="sm" onClick={markAllRead}>
          <CheckCheck size={14} /> Mark all read
        </Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up" description="New notifications will appear here." />
        ) : (
          <Card className="divide-y divide-line">
            {data.map((n) => (
              <button
                key={n._id}
                onClick={() => markRead(n._id)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-paper ${!n.isRead ? 'bg-signal-faint/40' : ''}`}
              >
                <p className="text-sm text-ink">{n.message}</p>
                <span className="shrink-0 text-xs text-ink-faint">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
              </button>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
