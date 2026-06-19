import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RegistrationConfirmDialog } from "@/components/exhibitions/RegistrationConfirmDialog";

interface Event {
  id: string; title: string; description: string | null; location: string | null;
  starts_at: string; ends_at: string | null; capacity: number | null; status: string;
  cover_image_url: string | null;
}

const Exhibitions = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gallery_events")
        .select("*")
        .eq("published", true)
        .order("starts_at", { ascending: true });
      setEvents((data as Event[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const register = async (eventId: string) => {
    if (!user) return toast.error("Please sign in to register");
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    const name = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? null;
    const { data, error } = await supabase.from("event_attendees").insert({
      event_id: eventId,
      user_id: user.id,
      name,
      email: user.email ?? null,
    }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Registered — see you there!");
    setConfirmation({
      title: ev.title,
      starts_at: ev.starts_at,
      location: ev.location,
      name,
      email: user.email,
      confirmation: data?.id ?? "",
    });
  };

  const upcoming = events.filter(e => new Date(e.starts_at) >= new Date());
  const past = events.filter(e => new Date(e.starts_at) < new Date());

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gradient-gold">Exhibitions & Events</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Discover upcoming exhibitions, openings and events at our gallery.
            </p>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground">No exhibitions scheduled at the moment. Check back soon.</p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section className="mb-16">
                  <h2 className="font-display text-2xl text-foreground mb-6">Upcoming</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {upcoming.map(e => <EventCard key={e.id} event={e} onRegister={register} />)}
                  </div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl text-muted-foreground mb-6">Past Events</h2>
                  <div className="grid md:grid-cols-2 gap-6 opacity-70">
                    {past.map(e => <EventCard key={e.id} event={e} past />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <RegistrationConfirmDialog open={!!confirmation} onClose={() => setConfirmation(null)} details={confirmation} />
    </div>
  );
};

const EventCard = ({ event, onRegister, past }: { event: Event; onRegister?: (id: string) => void; past?: boolean }) => (
  <article className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition">
    {event.cover_image_url && (
      <img src={event.cover_image_url} alt={event.title} className="w-full h-48 object-cover" loading="lazy" />
    )}
    <div className="p-6">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={event.status === "ongoing" ? "default" : "outline"}>{event.status}</Badge>
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">{event.title}</h3>
      <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(event.starts_at).toLocaleString()}{event.ends_at && ` → ${new Date(event.ends_at).toLocaleString()}`}</p>
        {event.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{event.location}</p>}
        {event.capacity && <p className="flex items-center gap-2"><Users className="h-4 w-4" />Capacity: {event.capacity}</p>}
      </div>
      {event.description && <p className="text-sm text-foreground/80 mb-4 line-clamp-3">{event.description}</p>}
      {!past && onRegister && (
        <Button onClick={() => onRegister(event.id)} className="bg-gradient-gold text-primary-foreground">Register</Button>
      )}
    </div>
  </article>
);

export default Exhibitions;
