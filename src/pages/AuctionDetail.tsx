import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Gavel, Clock, ArrowLeft, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const AuctionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const fetchAuction = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("auctions")
      .select("*, artworks(title, image_url, description, artists(name, id))")
      .eq("id", id)
      .maybeSingle();
    if (data) setAuction(data);
  };

  const fetchBids = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("bids")
      .select("*, profiles:bidder_id(display_name)")
      .eq("auction_id", id)
      .order("amount", { ascending: false })
      .limit(20);
    if (data) setBids(data);
  };

  useEffect(() => {
    fetchAuction();
    fetchBids();

    const channel = supabase
      .channel(`auction-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids", filter: `auction_id=eq.${id}` }, () => {
        fetchBids();
        fetchAuction();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!auction) return;
    const timer = setInterval(() => {
      const diff = new Date(auction.ends_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Auction ended"); clearInterval(timer); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  const handleBid = async () => {
    if (!user || !auction || !id) return;
    const amount = parseFloat(bidAmount);
    const minBid = Number(auction.current_bid || auction.starting_price);
    if (isNaN(amount) || amount <= minBid) {
      toast({ title: `Bid must be higher than $${minBid.toLocaleString()}`, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error: bidError } = await supabase.from("bids").insert({
      auction_id: id,
      bidder_id: user.id,
      amount,
    });

    if (!bidError) {
      await supabase.from("auctions").update({
        current_bid: amount,
        bid_count: (auction.bid_count || 0) + 1,
      }).eq("id", id);
      toast({ title: "Bid placed successfully!" });
      setBidAmount("");
    } else {
      toast({ title: "Failed to place bid", description: bidError.message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (!auction) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container pt-24 pb-16 text-center text-muted-foreground">Auction not found.</main>
        <Footer />
      </div>
    );
  }

  const isActive = auction.status === "active" && new Date(auction.ends_at) > new Date();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-24 pb-16">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/auctions"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Auctions</Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-10">
          <div className="rounded-xl overflow-hidden bg-secondary aspect-square">
            {auction.artworks?.image_url ? (
              <img src={auction.artworks.image_url} alt={auction.artworks.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Gavel className="h-20 w-20 text-muted-foreground/20" /></div>
            )}
          </div>

          <div>
            <Badge className={isActive ? "bg-avatar-ring text-primary-foreground" : "bg-secondary"}>
              {isActive ? "Live Auction" : auction.status}
            </Badge>
            <h1 className="font-display text-3xl font-bold text-foreground mt-3">{auction.artworks?.title || "Untitled"}</h1>
            {auction.artworks?.artists && (
              <Link to={`/artist/${auction.artworks.artists.id}`} className="text-sm text-primary hover:underline mt-1 block">
                by {auction.artworks.artists.name}
              </Link>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Starting Price</p>
                <p className="font-display text-xl font-bold text-foreground">${Number(auction.starting_price).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs text-primary">Current Bid</p>
                <p className="font-display text-xl font-bold text-gradient-gold">${Number(auction.current_bid || auction.starting_price).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {timeLeft}</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" /> {auction.bid_count} bids</span>
            </div>

            {isActive && user && user.id !== auction.seller_id && (
              <div className="mt-6 flex gap-2">
                <Input
                  type="number"
                  placeholder={`Min $${(Number(auction.current_bid || auction.starting_price) + 1).toLocaleString()}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="max-w-[200px]"
                />
                <Button onClick={handleBid} disabled={loading}>
                  <Gavel className="mr-1 h-4 w-4" /> {loading ? "Placing..." : "Place Bid"}
                </Button>
              </div>
            )}

            <div className="mt-8">
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">Bid History</h3>
              {bids.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bids.map((bid, i) => (
                    <div key={bid.id} className={`flex items-center justify-between rounded-lg border p-3 ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {(bid as any).profiles?.display_name || "Anonymous"}
                        </span>
                        {i === 0 && <Badge variant="secondary" className="text-xs">Highest</Badge>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${Number(bid.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(bid.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bids yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuctionDetail;
