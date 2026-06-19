import { useEffect, useState } from "react";
import { Star, CheckCircle2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const ArtistRating = ({ artistId }: { artistId: string }) => {
  const { user } = useAuth();
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("artist_ratings")
      .select("rating, user_id")
      .eq("artist_id", artistId);

    if (data && data.length) {
      setAvg(Math.round((data.reduce((s, r) => s + r.rating, 0) / data.length) * 10) / 10);
      setCount(data.length);
      if (user) {
        const mine = data.find(r => r.user_id === user.id);
        setMyRating(mine?.rating ?? 0);
      }
    } else {
      setAvg(0); setCount(0); setMyRating(0);
    }
  };

  useEffect(() => { load(); }, [artistId, user?.id]);

  const rate = async (value: number) => {
    if (!user) return toast.error("Please sign in to rate");
    if (value < 1 || value > 5) return;
    if (myRating > 0 && !editing) {
      toast.info("You've already rated this artist. Tap 'Change rating' to update.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("artist_ratings").upsert(
      { artist_id: artistId, user_id: user.id, rating: value },
      { onConflict: "artist_id,user_id" }
    );
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(myRating > 0 ? `Updated your rating to ${value} ★` : `Thanks! You rated ${value} ★`);
    setEditing(false);
    load();
  };

  const hasRated = myRating > 0;
  const locked = hasRated && !editing;
  const display = hover || myRating;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Average summary */}
      <div className="flex items-center gap-4 pb-4 border-b border-border">
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground leading-none">
            {avg > 0 ? avg.toFixed(1) : "—"}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            out of 5
          </div>
        </div>
        <div className="flex-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                className={`h-4 w-4 ${n <= Math.round(avg) ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {count === 0 ? "No ratings yet" : `${count} ${count === 1 ? "vote" : "votes"}`}
          </p>
        </div>
      </div>

      {/* User's rating */}
      <div className="pt-4">
        {hasRated && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>You rated this artist <strong>{myRating} ★</strong>. Only one rating per artist is allowed.</span>
          </div>
        )}

        <p className="text-sm text-foreground mb-2">
          {locked ? "Your rating" : hasRated ? "Choose new rating" : "Rate this artist"}
        </p>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => {
            const filled = display >= n;
            return (
              <button
                key={n}
                type="button"
                disabled={submitting || locked}
                onMouseEnter={() => !locked && setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => rate(n)}
                className="transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label={`Rate ${n} stars`}
                title={locked ? "You've already rated this artist" : `Rate ${n} stars`}
              >
                <Star className={`h-7 w-7 ${filled ? "fill-primary text-primary" : locked ? "text-muted-foreground/30" : "text-muted-foreground"}`} />
              </button>
            );
          })}
        </div>

        {hasRated && (
          <div className="mt-3">
            {locked ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3 w-3" /> Change rating
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
