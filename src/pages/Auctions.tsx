import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gavel, Clock, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

interface Auction {
  id: string;
  artwork_id: string;
  starting_price: number;
  current_bid: number;
  bid_count: number;
  starts_at: string;
  ends_at: string;
  status: string;
  artwork_title?: string;
  artwork_image?: string;
  artist_name?: string;
}

const useCountdown = (endDate: string) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Ended"); clearInterval(timer); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate]);
  return timeLeft;
};

const AuctionCard = ({ auction }: { auction: Auction }) => {
  const timeLeft = useCountdown(auction.ends_at);
  const isActive = auction.status === "active" && new Date(auction.ends_at) > new Date();

  return (
    <Link to={`/auction/${auction.id}`} className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-gold hover:border-primary/30">
      <div className="aspect-square bg-secondary overflow-hidden relative">
        {auction.artwork_image ? (
          <img src={auction.artwork_image} alt={auction.artwork_title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="h-full w-full flex items-center justify-center"><Gavel className="h-12 w-12 text-muted-foreground/30" /></div>
        )}
        <Badge className={`absolute top-3 right-3 ${isActive ? "bg-avatar-ring text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
          {isActive ? "Live" : auction.status}
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-foreground truncate">{auction.artwork_title || "Untitled"}</h3>
        <p className="text-xs text-muted-foreground">{auction.artist_name || "Unknown Artist"}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Current Bid</p>
            <p className="font-semibold text-primary">${Number(auction.current_bid || auction.starting_price).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Time Left</p>
            <p className="font-semibold text-foreground">{timeLeft}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" /> {auction.bid_count} bids
        </div>
      </div>
    </Link>
  );
};

const Auctions = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchAuctions = async () => {
      const { data } = await supabase
        .from("auctions")
        .select("*, artworks(title, image_url, artists(name))")
        .order("ends_at", { ascending: true });

      if (data) {
        setAuctions(data.map((a: any) => ({
          ...a,
          artwork_title: a.artworks?.title,
          artwork_image: a.artworks?.image_url,
          artist_name: a.artworks?.artists?.name,
        })));
      }
    };
    fetchAuctions();

    const channel = supabase
      .channel("auctions-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => fetchAuctions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === "all" ? auctions : auctions.filter((a) => a.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-24 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient-gold flex items-center gap-2">
              <Gavel className="h-8 w-8" /> Auctions
            </h1>
            <p className="text-muted-foreground mt-1">Bid on exclusive artworks in real-time</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {["all", "upcoming", "active", "ended"].map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
              {f}
            </Button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Gavel className="mx-auto h-12 w-12 mb-3 opacity-30" />
            <p>No auctions found.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Auctions;
