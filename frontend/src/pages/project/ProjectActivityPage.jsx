import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { History } from 'lucide-react';
import { activityApi } from '../../lib/resources';
import { Card, Avatar } from '../../components/ui/Display';
import { EmptyState, Skeleton } from '../../components/ui/Overlay';

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
};

export default function ProjectActivityPage() {
  const { project } = useOutletContext();
  const { data, isLoading } = useQuery({
    queryKey: ['activity', project._id],
    queryFn: () => activityApi.list(project._id, { limit: 50 }).then((r) => r.data.data.activity),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Actions taken in this project will show up here." />;
  }

  return (
    <Card className="divide-y divide-line">
      {data.map((a) => (
        <div key={a._id} className="flex items-start gap-3 px-4 py-3">
          <Avatar name={a.actor?.name} size={7} />
          <div>
            <p className="text-sm text-ink">
              <span className="font-semibold">{a.actor?.name}</span> {ACTION_LABELS[a.action] || a.action.replace(/_/g, ' ').toLowerCase()}
            </p>
            <p className="text-xs text-ink-faint">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}
