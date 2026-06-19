import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const categories = ["general", "tutorial", "interview", "news", "review", "exhibition"];

const BlogWrite = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "general",
    tags: "",
    cover_image_url: "",
    published: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    const slug = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

    const { error } = await supabase.from("blog_posts").insert({
      author_id: user.id,
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: form.content,
      category: form.category,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      cover_image_url: form.cover_image_url || null,
      published: form.published,
      published_at: form.published ? new Date().toISOString() : null,
    });

    setLoading(false);
    if (error) {
      toast({ title: "Failed to save article", description: error.message, variant: "destructive" });
    } else {
      toast({ title: form.published ? "Article published!" : "Draft saved!" });
      navigate("/blog");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-24 pb-16 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-8">Write an Article</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Article title" />
          </div>
          <div>
            <Label>Excerpt</Label>
            <Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="art, tutorial, painting" />
          </div>
          <div>
            <Label>Cover Image URL</Label>
            <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label>Content *</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your article..." rows={12} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
            <Label>Publish immediately</Label>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : form.published ? "Publish Article" : "Save Draft"}
          </Button>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default BlogWrite;
