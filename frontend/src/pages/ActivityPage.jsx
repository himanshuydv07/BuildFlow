import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { activityApi } from '../lib/resources';
import { Card, Avatar } from '../components/ui/Display';
import { EmptyState, Skeleton } from '../components/ui/Overlay';
import Button from '../components/ui/Button';

const ACTION_LABELS = {
  PROJECT_CREATED: 'created the project',
  PROJECT_UPDATED: 'updated project settings',
  PROJECT_ARCHIVED: 'archived the project',
  OWNERSHIP_TRANSFERRED: 'transferred ownership',
  MEMBER_INVITED: 'invited a member',
  INVITATION_ACCEPTED: 'accepted an invitation',
  MEMBER_ROLE_CHANGED: "changed a teammate's role",
  MEMBER_REMOVED: 'removed a member',
  MEMBER_LEFT: 'left the project',
  TASK_CREATED: 'created a task',
  TASK_UPDATED: 'updated a task',
  TASK_STATUS_CHANGED: 'changed a task status',
  TASK_DELETED: 'deleted a task',
  MILESTONE_CREATED: 'created a milestone',
  MILESTONE_UPDATED: 'updated a milestone',
  MILESTONE_DELETED: 'deleted a milestone',
  COMMENT_ADDED: 'commented on a task',
  FILE_UPLOADED: 'uploaded a file',
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['my-activity', page],
    queryFn: () => activityApi.listMine({ page, limit }).then((r) => r.data),
  });

  const activity = data?.data?.activity || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">Activity</h1>
      <p className="mt-1 text-sm text-ink-muted">Everything happening across every project you're part of.</p>

      <div className="mt-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : activity.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Actions across your projects will show up here." />
        ) : (
          <>
            <Card className="divide-y divide-line">
              {activity.map((a) => (
                <div key={a._id} className="flex items-start gap-3 px-4 py-3">
                  <Avatar name={a.actor?.name} size={7} />
                  <div className="flex-1">
                    <p className="text-sm text-ink">
                      <span className="font-semibold">{a.actor?.name || 'Someone'}</span>{' '}
                      {ACTION_LABELS[a.action] || a.action.replace(/_/g, ' ').toLowerCase()}
                      {a.projectId?.name && (
                        <span className="text-ink-muted">
                          {' '}
                          in <span className="font-medium text-ink">{a.projectId.icon} {a.projectId.name}</span>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-faint">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </Card>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-ink-muted">
                  Page {page} of {totalPages}
                </span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
