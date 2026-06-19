import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Eye, Heart, PenLine, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
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

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { user } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (data) setPosts(data);
    };
    fetchPosts();
  }, []);

  const categories = ["all", ...new Set(posts.map((p) => p.category))];
  const filtered = posts.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.excerpt?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient-gold">Blog & Articles</h1>
            <p className="text-muted-foreground mt-1">Art news, tutorials, and artist interviews</p>
          </div>
          {user && (
            <Button asChild>
              <Link to="/blog/write"><PenLine className="mr-1 h-4 w-4" /> Write Article</Link>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="capitalize"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-gold hover:border-primary/30"
              >
                <div className="aspect-video bg-secondary overflow-hidden">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <PenLine className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <Badge variant="secondary" className="mb-2 capitalize">{post.category}</Badge>
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.published_at || post.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.views_count}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {post.likes_count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <PenLine className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No articles found. Be the first to write one!</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
