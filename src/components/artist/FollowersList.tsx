import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Mail, ChevronLeft, ChevronRight } from "lucide-react";

interface Follower {
  follower_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  followed_at: string;
  total_count: number;
}

const PAGE_SIZE = 10;

export const FollowersList = ({ artistId, isOwner }: { artistId: string; isOwner: boolean }) => {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOwner) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_artist_followers", {
        _artist_id: artistId,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (cancelled) return;
      if (!error && data) {
        const rows = data as Follower[];
        setFollowers(rows);
        setTotal(rows[0]?.total_count ? Number(rows[0].total_count) : 0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [artistId, isOwner, page]);

  if (!isOwner) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Your Followers
          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {total}
          </span>
        </h4>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : followers.length === 0 ? (
        <p className="text-xs text-muted-foreground">No followers yet.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {followers.map(f => {
              const primary = f.display_name?.trim() || f.email || "Anonymous follower";
              const showSecondary = f.email && f.display_name && f.display_name !== f.email;
              return (
                <li key={f.follower_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {f.avatar_url ? <AvatarImage src={f.avatar_url} /> : null}
                    <AvatarFallback className="text-xs">
                      {primary.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{primary}</p>
                    {showSecondary && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {f.email}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
