import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { searchApi } from '../lib/resources';
import { Card } from '../components/ui/Display';
import { EmptyState, Skeleton } from '../components/ui/Overlay';

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.search(q).then((r) => r.data.data),
    enabled: q.length >= 2,
  });

  const total = data ? Object.values(data).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="font-display text-2xl font-bold text-ink">Search results for "{q}"</h1>

      <div className="mt-6 space-y-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : total === 0 ? (
          <EmptyState icon={SearchIcon} title="No results" description="Try a different search term." />
        ) : (
          <>
            <ResultSection title="Projects" items={data.projects} render={(p) => <Link to={`/projects/${p._id}`}>{p.icon} {p.name}</Link>} />
            <ResultSection
              title="Tasks"
              items={data.tasks}
              render={(t) => (
                <Link to={`/projects/${t.projectId._id}/tasks?taskId=${t._id}`}>
                  {t.title} <span className="text-ink-faint">in {t.projectId.name}</span>
                </Link>
              )}
            />
            <ResultSection
              title="Milestones"
              items={data.milestones}
              render={(m) => (
                <span>
                  {m.name} <span className="text-ink-faint">in {m.projectId.name}</span>
                </span>
              )}
            />
            <ResultSection title="People" items={data.members} render={(u) => <span>{u.name}</span>} />
            <ResultSection title="Comments" items={data.comments} render={(c) => <span>"{c.content}" — {c.author?.name}</span>} />
          </>
        )}
      </div>
    </div>
  );
}

function ResultSection({ title, items, render }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-ink">{title}</h2>
      <Card className="divide-y divide-line">
        {items.map((item) => (
          <div key={item._id} className="px-4 py-2.5 text-sm text-ink">
            {render(item)}
          </div>
        ))}
      </Card>
    </div>
  );
}
