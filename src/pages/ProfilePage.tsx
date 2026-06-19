import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Package, Settings } from "lucide-react";
import ArtistApplicationSection from "@/components/ArtistApplicationSection";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  artwork_id: string;
  created_at: string;
  artwork?: {
    title: string;
    price: number;
    image_url: string | null;
    artists?: { name: string } | null;
  };
}

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"profile" | "orders">("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [profileRes, ordersRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, avatar_url, created_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("cart_items")
          .select("id, artwork_id, created_at, artworks(title, price, image_url, artists(name))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (profileRes.data) {
        setProfile(profileRes.data);
        setDisplayName(profileRes.data.display_name || "");
      }
      setOrders(
        (ordersRes.data ?? []).map((item: any) => ({
          id: item.id,
          artwork_id: item.artwork_id,
          created_at: item.created_at,
          artwork: item.artworks
            ? {
                title: item.artworks.title,
                price: item.artworks.price,
                image_url: item.artworks.image_url,
                artists: item.artworks.artists,
              }
            : undefined,
        }))
      );
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", user.id);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated");
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-foreground">My Account</h1>
          <p className="mt-1 text-muted-foreground">{user?.email}</p>

          {/* Tabs */}
          <div className="mt-8 flex gap-2">
            <button
              onClick={() => setTab("profile")}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
                tab === "profile" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Settings className="h-4 w-4" /> Profile
            </button>
            <button
              onClick={() => setTab("orders")}
              className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-all ${
                tab === "orders" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Package className="h-4 w-4" /> Cart History
            </button>
          </div>

          {/* Profile Tab */}
          {tab === "profile" && (
            <>
              <div className="mt-8 rounded-lg border border-border bg-card p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-avatar-ring bg-avatar-ring/20 shadow-[0_0_12px_hsl(var(--avatar-ring)/0.4)]">
                    <User className="h-8 w-8 text-avatar-ring" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">
                      {profile?.display_name || "No name set"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <div>
                    <Label className="text-foreground">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-1 bg-secondary border-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Email</Label>
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="mt-1 bg-muted border-border text-muted-foreground"
                    />
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <ArtistApplicationSection />
              </div>
            </>
          )}

          {/* Orders Tab */}
          {tab === "orders" && (
            <div className="mt-8 space-y-3">
              {orders.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-10 text-center">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">No items in your cart history yet.</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                    {order.artwork?.image_url && (
                      <img
                        src={order.artwork.image_url}
                        alt={order.artwork?.title}
                        className="h-16 w-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{order.artwork?.title ?? "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.artwork?.artists?.name ?? "Unknown artist"} · Added {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-primary">
                      ${order.artwork?.price?.toLocaleString() ?? "—"}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
