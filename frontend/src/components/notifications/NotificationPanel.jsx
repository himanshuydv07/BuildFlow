import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../lib/resources';
import { Skeleton } from '../ui/Overlay';

export default function NotificationPanel({ onClose }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'panel'],
    queryFn: () => notificationsApi.list({ limit: 10 }).then((r) => r.data.data.notifications),
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
    <div className="absolute right-0 top-full z-40 mt-1 w-96 rounded-md border border-line bg-white shadow-pop">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-sm font-semibold text-ink">Notifications</span>
        <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-signal-dim hover:underline">
          <CheckCheck size={13} /> Mark all read
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {!isLoading && (data || []).length === 0 && <p className="p-6 text-center text-sm text-ink-muted">You're all caught up.</p>}
        {(data || []).map((n) => (
          <button
            key={n._id}
            onClick={() => markRead(n._id)}
            className={`flex w-full flex-col gap-0.5 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-paper ${
              !n.isRead ? 'bg-signal-faint/40' : ''
            }`}
          >
            <p className="text-sm text-ink">{n.message}</p>
            <span className="text-xs text-ink-faint">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
