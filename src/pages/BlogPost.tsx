import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Eye, Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
  created_at: string;
  views_count: number;
  likes_count: number;
  author_id: string;
}

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (data) {
        setPost(data);
        // Increment views
        await supabase.from("blog_posts").update({ views_count: data.views_count + 1 }).eq("id", data.id);
        // Fetch author name
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", data.author_id).maybeSingle();
        setAuthorName(profile?.display_name || "Anonymous");
      }
    };
    fetchPost();
  }, [slug]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container pt-24 pb-16 text-center text-muted-foreground">Article not found.</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-24 pb-16 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/blog"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Blog</Link>
        </Button>

        {post.cover_image_url && (
          <div className="rounded-xl overflow-hidden mb-8 aspect-video">
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}

        <Badge variant="secondary" className="capitalize mb-3">{post.category}</Badge>
        <h1 className="font-display text-4xl font-bold text-foreground mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          <span>By {authorName}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.published_at || post.created_at).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.views_count + 1}</span>
        </div>

        <div className="prose prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>

        {post.tags.length > 0 && (
          <div className="mt-10 flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
