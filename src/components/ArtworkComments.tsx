import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Trash2, Star, Heart, Share2, MessageCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: { display_name: string | null } | null;
}

interface Rating {
  id: string;
  rating: number;
  user_id: string;
}

interface ArtworkEngagementProps {
  artworkId: string;
  artistUserId?: string | null;
  artworkTitle: string;
}

const ArtworkEngagement = ({ artworkId, artistUserId, artworkTitle }: ArtworkEngagementProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchRatings();
    fetchLikes();
  }, [artworkId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, content, user_id, created_at")
      .eq("artwork_id", artworkId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch profiles for comment authors
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setComments(data.map(c => ({ ...c, profile: profileMap.get(c.user_id) || null })));
    }
  };

  const fetchRatings = async () => {
    const { data } = await supabase.from("ratings").select("*").eq("artwork_id", artworkId);
    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setRatingCount(data.length);
      if (user) {
        const userR = data.find(r => r.user_id === user.id);
        if (userR) setUserRating(userR.rating);
      }
    }
  };

  const fetchLikes = async () => {
    const { count } = await supabase.from("likes").select("id", { count: "exact" }).eq("artwork_id", artworkId);
    setLikeCount(count || 0);
    if (user) {
      const { data } = await supabase.from("likes").select("id").eq("artwork_id", artworkId).eq("user_id", user.id).maybeSingle();
      setLiked(!!data);
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      artwork_id: artworkId,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (error) toast.error("Failed to post comment");
    else {
      setNewComment("");
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) fetchComments();
  };

  const handleRate = async (rating: number) => {
    if (!user) { toast.error("Please sign in to rate"); return; }
    if (userRating > 0) {
      await supabase.from("ratings").update({ rating }).eq("artwork_id", artworkId).eq("user_id", user.id);
    } else {
      await supabase.from("ratings").insert({ artwork_id: artworkId, user_id: user.id, rating });
    }
    setUserRating(rating);
    fetchRatings();
  };

  const handleLike = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    if (liked) {
      await supabase.from("likes").delete().eq("artwork_id", artworkId).eq("user_id", user.id);
      setLiked(false);
      setLikeCount(c => c - 1);
    } else {
      await supabase.from("likes").insert({ artwork_id: artworkId, user_id: user.id });
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: artworkTitle, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleContactArtist = async () => {
    if (!user || !artistUserId || !contactMessage.trim()) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: artistUserId,
      artwork_id: artworkId,
      subject: `Inquiry about "${artworkTitle}"`,
      content: contactMessage.trim(),
    });
    if (error) toast.error("Failed to send message");
    else {
      toast.success("Message sent to artist!");
      setContactMessage("");
      setShowContactForm(false);
    }
    setSendingMessage(false);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center gap-4 border-y border-border py-4">
        <button onClick={handleLike} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors">
          <Heart className={`h-5 w-5 ${liked ? "fill-destructive text-destructive" : ""}`} />
          <span>{likeCount}</span>
        </button>
        <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <Share2 className="h-5 w-5" />
          <span>Share</span>
        </button>
        {artistUserId && user && artistUserId !== user.id && (
          <button onClick={() => setShowContactForm(!showContactForm)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <Mail className="h-5 w-5" />
            <span>Contact Artist</span>
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-1">{avgRating > 0 ? avgRating : "—"}</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => handleRate(star)}
              className="transition-colors"
            >
              <Star className={`h-4 w-4 ${
                star <= (hoverRating || userRating) ? "fill-primary text-primary" : "text-muted-foreground"
              }`} />
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-1">({ratingCount})</span>
        </div>
      </div>

      {/* Contact Artist Form */}
      {showContactForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 className="text-sm font-medium text-foreground">Contact Artist</h4>
          <Textarea
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            placeholder="Write your message to the artist..."
            className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            rows={3}
          />
          <Button onClick={handleContactArtist} disabled={sendingMessage || !contactMessage.trim()} size="sm" className="bg-gradient-gold text-primary-foreground">
            <Send className="mr-1 h-3 w-3" /> {sendingMessage ? "Sending..." : "Send Message"}
          </Button>
        </div>
      )}

      {/* Comments */}
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <MessageCircle className="h-5 w-5" /> Comments ({comments.length})
        </h3>

        {user && (
          <div className="mt-4 flex gap-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              rows={2}
            />
            <Button onClick={handleComment} disabled={submitting || !newComment.trim()} size="icon" className="mt-auto bg-gradient-gold text-primary-foreground">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary text-xs text-foreground">
                  {(comment.profile?.display_name || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{comment.profile?.display_name || "User"}</span>
                  <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-sm text-foreground/80">{comment.content}</p>
              </div>
              {user?.id === comment.user_id && (
                <button onClick={() => handleDeleteComment(comment.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtworkEngagement;
