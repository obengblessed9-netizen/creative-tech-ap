import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ArtworkCard from "@/components/ArtworkCard";
import VerificationDialog from "@/components/VerificationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { FollowersList } from "@/components/artist/FollowersList";
import { ArtistRating } from "@/components/artist/ArtistRating";
import {
  Settings, Users, CheckCircle, ShieldCheck, ImageIcon, Pencil, Save, X,
  Globe, Instagram, Facebook, Youtube, Linkedin, Award, GraduationCap, Calendar, MapPin,
  Mail, Share2, Heart, Star, MessageCircle, CalendarDays, Send
} from "lucide-react";

interface ArtistData {
  id: string;
  name: string;
  bio: string | null;
  specialty: string | null;
  image_url: string | null;
  verified: boolean;
  verification_status: string;
  user_id: string | null;
  real_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  gender: string | null;
  art_style: string | null;
  medium_used: string | null;
  full_biography: string | null;
  years_active: number | null;
  education: string | null;
  exhibitions: string | null;
  awards: string | null;
  tags: string[] | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  pinterest_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  behance_url: string | null;
  dribbble_url: string | null;
  linkedin_url: string | null;
}

interface ArtworkData {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  medium: string | null;
  category: string | null;
  year: number | null;
  available: boolean;
  description: string | null;
  dimensions: string | null;
  artist_id: string | null;
}

const ArtistProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [artworks, setArtworks] = useState<ArtworkData[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ArtistData>>({});
  const [saving, setSaving] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  const isOwner = user && artist?.user_id === user.id;

  useEffect(() => {
    if (!id) return;
    const fetchArtist = async () => {
      setLoading(true);
      const [artistRes, artworksRes, followersRes] = await Promise.all([
        supabase.from("artists").select("*").eq("id", id).maybeSingle(),
        supabase.from("artworks").select("*").eq("artist_id", id),
        supabase.from("followers").select("id", { count: "exact" }).eq("artist_id", id),
      ]);

      if (artistRes.data) {
        const a = artistRes.data as ArtistData;
        setArtist(a);
        setEditForm(a);
      }
      if (artworksRes.data) {
        setArtworks(artworksRes.data as ArtworkData[]);
        // Fetch engagement stats for all artworks
        const artworkIds = (artworksRes.data as ArtworkData[]).map(a => a.id);
        if (artworkIds.length > 0) {
          const [likesRes, ratingsRes, commentsRes] = await Promise.all([
            supabase.from("likes").select("id", { count: "exact" }).in("artwork_id", artworkIds),
            supabase.from("ratings").select("rating").in("artwork_id", artworkIds),
            supabase.from("comments").select("id", { count: "exact" }).in("artwork_id", artworkIds),
          ]);
          setTotalLikes(likesRes.count ?? 0);
          setTotalComments(commentsRes.count ?? 0);
          if (ratingsRes.data && ratingsRes.data.length > 0) {
            const avg = ratingsRes.data.reduce((sum, r) => sum + r.rating, 0) / ratingsRes.data.length;
            setAvgRating(Math.round(avg * 10) / 10);
          }
        }
      }
      setFollowerCount(followersRes.count ?? 0);

      if (user) {
        const { data: followData } = await supabase.from("followers").select("id").eq("artist_id", id).eq("follower_id", user.id).maybeSingle();
        setIsFollowing(!!followData);
      }
      setLoading(false);
    };
    fetchArtist();
  }, [id, user]);

  const toggleFollow = async () => {
    if (!user || !id) { navigate("/auth"); return; }
    if (isFollowing) {
      await supabase.from("followers").delete().eq("artist_id", id).eq("follower_id", user.id);
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
    } else {
      const { error } = await supabase.from("followers").insert({ artist_id: id, follower_id: user.id });
      if (error) { toast.error("Could not follow artist"); return; }
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  const handleShareProfile = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `${artist?.name} - Artist Profile`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Profile link copied to clipboard!");
    }
  };

  const handleContactArtist = async () => {
    if (!user || !artist?.user_id || !contactMessage.trim()) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: artist.user_id,
      subject: contactSubject.trim() || `Message from a fan`,
      content: contactMessage.trim(),
    });
    if (error) toast.error("Failed to send message");
    else {
      toast.success("Message sent to artist!");
      setContactMessage("");
      setContactSubject("");
      setShowContactForm(false);
    }
    setSendingMessage(false);
  };

  const handleBookExhibition = async () => {
    if (!user || !artist?.user_id || !bookingMessage.trim()) return;
    setSendingMessage(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: artist.user_id,
      subject: "Exhibition Booking Inquiry",
      content: bookingMessage.trim(),
    });
    if (error) toast.error("Failed to send booking request");
    else {
      toast.success("Exhibition booking request sent!");
      setBookingMessage("");
      setShowBookingForm(false);
    }
    setSendingMessage(false);
  };

  const handleSaveProfile = async () => {
    if (!artist) return;
    setSaving(true);
    const cleanUsername = editForm.username?.trim() || null;

    if (cleanUsername && cleanUsername !== artist.username) {
      const { data: existing } = await supabase
        .from("artists")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", artist.id)
        .maybeSingle();
      if (existing) {
        toast.error("That username is already taken. Please pick another.");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from("artists").update({
      name: editForm.name?.trim() || artist.name,
      bio: editForm.bio?.trim() || null,
      specialty: editForm.specialty?.trim() || null,
      real_name: editForm.real_name?.trim() || null,
      username: cleanUsername,
      email: editForm.email?.trim() || null,
      phone: editForm.phone?.trim() || null,
      city: editForm.city?.trim() || null,
      country: editForm.country?.trim() || null,
      art_style: editForm.art_style?.trim() || null,
      medium_used: editForm.medium_used?.trim() || null,
      full_biography: editForm.full_biography?.trim() || null,
      years_active: editForm.years_active || null,
      education: editForm.education?.trim() || null,
      exhibitions: editForm.exhibitions?.trim() || null,
      awards: editForm.awards?.trim() || null,
      website_url: editForm.website_url?.trim() || null,
      instagram_url: editForm.instagram_url?.trim() || null,
      facebook_url: editForm.facebook_url?.trim() || null,
      youtube_url: editForm.youtube_url?.trim() || null,
      linkedin_url: editForm.linkedin_url?.trim() || null,
      behance_url: editForm.behance_url?.trim() || null,
      dribbble_url: editForm.dribbble_url?.trim() || null,
      pinterest_url: editForm.pinterest_url?.trim() || null,
      tiktok_url: editForm.tiktok_url?.trim() || null,
    }).eq("id", artist.id);

    if (error) {
      if ((error as any).code === "23505" && String(error.message).includes("username")) {
        toast.error("That username is already taken. Please pick another.");
      } else {
        toast.error("Failed to update profile");
      }
    } else {
      setArtist(prev => prev ? { ...prev, ...editForm } : prev);
      toast.success("Profile updated!");
      setEditing(false);
    }
    setSaving(false);
  };

  const updateField = (key: keyof ArtistData, value: any) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container pt-24 text-center text-muted-foreground">Loading artist profile...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="container pt-24 text-center text-muted-foreground">Artist not found.</div>
        <Footer />
      </div>
    );
  }

  const socialLinks = [
    { url: artist.website_url, icon: Globe, label: "Website" },
    { url: artist.instagram_url, icon: Instagram, label: "Instagram" },
    { url: artist.facebook_url, icon: Facebook, label: "Facebook" },
    { url: artist.youtube_url, icon: Youtube, label: "YouTube" },
    { url: artist.linkedin_url, icon: Linkedin, label: "LinkedIn" },
  ].filter(l => l.url);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            {/* Left Sidebar */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-6">
                {isOwner && !editing && (
                  <div className="mb-4 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => setEditing(true)}>
                      <Pencil className="mr-1 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/profile")}>
                      <Settings className="mr-1 h-4 w-4" /> Settings
                    </Button>
                  </div>
                )}

                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 border-[3px] border-avatar-ring shadow-[0_0_12px_hsl(var(--avatar-ring)/0.4)]">
                    {artist.image_url ? <AvatarImage src={artist.image_url} alt={artist.name} /> : null}
                    <AvatarFallback className="bg-avatar-ring/20 text-2xl text-avatar-ring">
                      {artist.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {editing ? (
                    <div className="mt-4 w-full space-y-3 text-left max-h-[60vh] overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-foreground text-xs">Artist Name *</Label>
                          <Input value={editForm.name || ""} onChange={e => updateField("name", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                        </div>
                        <div>
                          <Label className="text-foreground text-xs">Username</Label>
                          <Input value={editForm.username || ""} onChange={e => updateField("username", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" placeholder="@handle" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Real Name</Label>
                        <Input value={editForm.real_name || ""} onChange={e => updateField("real_name", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-foreground text-xs">City</Label>
                          <Input value={editForm.city || ""} onChange={e => updateField("city", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                        </div>
                        <div>
                          <Label className="text-foreground text-xs">Country</Label>
                          <Input value={editForm.country || ""} onChange={e => updateField("country", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-foreground text-xs">Email</Label>
                          <Input value={editForm.email || ""} onChange={e => updateField("email", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                        </div>
                        <div>
                          <Label className="text-foreground text-xs">Phone</Label>
                          <Input value={editForm.phone || ""} onChange={e => updateField("phone", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Art Specialization</Label>
                        <Input value={editForm.specialty || ""} onChange={e => updateField("specialty", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" placeholder="e.g. Painter, Digital Artist" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Art Style</Label>
                        <Input value={editForm.art_style || ""} onChange={e => updateField("art_style", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" placeholder="e.g. Abstract, Realism" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Medium Used</Label>
                        <Input value={editForm.medium_used || ""} onChange={e => updateField("medium_used", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" placeholder="e.g. Oil, Acrylic, Digital" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Short Bio</Label>
                        <Textarea value={editForm.bio || ""} onChange={e => updateField("bio", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" rows={2} />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Full Biography</Label>
                        <Textarea value={editForm.full_biography || ""} onChange={e => updateField("full_biography", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" rows={4} placeholder="Your career journey..." />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-foreground text-xs">Years Active</Label>
                          <Input type="number" value={editForm.years_active || ""} onChange={e => updateField("years_active", parseInt(e.target.value) || null)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                        </div>
                        <div>
                          <Label className="text-foreground text-xs">Gender</Label>
                          <Input value={editForm.gender || ""} onChange={e => updateField("gender", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Education / Training</Label>
                        <Textarea value={editForm.education || ""} onChange={e => updateField("education", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" rows={2} />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Exhibitions</Label>
                        <Textarea value={editForm.exhibitions || ""} onChange={e => updateField("exhibitions", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" rows={2} />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Awards / Recognitions</Label>
                        <Textarea value={editForm.awards || ""} onChange={e => updateField("awards", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" rows={2} />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground pt-2">Social Links</p>
                      <div>
                        <Label className="text-foreground text-xs">Website</Label>
                        <Input value={editForm.website_url || ""} onChange={e => updateField("website_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" placeholder="https://" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Instagram</Label>
                        <Input value={editForm.instagram_url || ""} onChange={e => updateField("instagram_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" placeholder="https://instagram.com/..." />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Facebook</Label>
                        <Input value={editForm.facebook_url || ""} onChange={e => updateField("facebook_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">YouTube</Label>
                        <Input value={editForm.youtube_url || ""} onChange={e => updateField("youtube_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">LinkedIn</Label>
                        <Input value={editForm.linkedin_url || ""} onChange={e => updateField("linkedin_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Behance</Label>
                        <Input value={editForm.behance_url || ""} onChange={e => updateField("behance_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Pinterest</Label>
                        <Input value={editForm.pinterest_url || ""} onChange={e => updateField("pinterest_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">TikTok</Label>
                        <Input value={editForm.tiktok_url || ""} onChange={e => updateField("tiktok_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Dribbble</Label>
                        <Input value={editForm.dribbble_url || ""} onChange={e => updateField("dribbble_url", e.target.value)} className="mt-1 bg-secondary border-border text-foreground text-sm" />
                      </div>
                      <div className="flex gap-2 pt-2 sticky bottom-0 bg-card py-2">
                        <Button onClick={handleSaveProfile} disabled={saving || !editForm.name?.trim()} size="sm" className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                          <Save className="mr-1 h-4 w-4" /> {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button onClick={() => { setEditing(false); setEditForm(artist); }} variant="ghost" size="sm">
                          <X className="mr-1 h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="mt-4 font-display text-xl font-bold text-foreground flex items-center gap-2">
                        {artist.name}
                        {artist.verified && <ShieldCheck className="h-5 w-5 text-primary" />}
                      </h1>
                      {artist.username && <p className="text-sm text-muted-foreground">@{artist.username}</p>}
                      {artist.specialty && <p className="mt-1 text-sm text-primary">{artist.specialty}</p>}
                      {artist.art_style && <p className="text-xs text-muted-foreground">{artist.art_style}</p>}
                      {(artist.city || artist.country) && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {[artist.city, artist.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {artist.bio && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{artist.bio}</p>}
                    </>
                  )}
                </div>

                {/* Verification Badge */}
                {artist.verified ? (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-md bg-primary/10 px-3 py-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Verified Artist</span>
                  </div>
                ) : isOwner ? (
                  <Button onClick={() => setShowVerification(true)} variant="outline" className="mt-4 w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Verify Identity
                  </Button>
                ) : null}

                {/* Social Links */}
                {socialLinks.length > 0 && !editing && (
                  <div className="mt-4 border-t border-border pt-4 flex flex-wrap gap-2 justify-center">
                    {socialLinks.map((link, i) => (
                      <a key={i} href={link.url!} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/80 transition-colors" title={link.label}>
                        <link.icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Follow */}
                <div className="mt-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Followers</span>
                    <span className="ml-auto text-sm font-bold text-foreground">{followerCount}</span>
                  </div>
                  {!isOwner && (
                    <Button onClick={toggleFollow} variant={isFollowing ? "secondary" : "default"} className={`mt-3 w-full ${!isFollowing ? "bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90" : ""}`}>
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                  )}
                </div>

                {/* Stats & Engagement */}
                <div className="mt-4 border-t border-border pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Artworks</span>
                    <span className="ml-auto text-sm font-bold text-foreground">{artworks.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm font-medium">Total Likes</span>
                    <span className="ml-auto text-sm font-bold text-foreground">{totalLikes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <span className="text-sm font-medium">Avg Rating</span>
                    <span className="ml-auto text-sm font-bold text-foreground">{avgRating > 0 ? avgRating : "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Comments</span>
                    <span className="ml-auto text-sm font-bold text-foreground">{totalComments}</span>
                  </div>
                  {artist.years_active && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Years Active</span>
                      <span className="ml-auto text-sm font-bold text-foreground">{artist.years_active}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isOwner && !editing && (
                  <div className="mt-4 border-t border-border pt-4 space-y-2">
                    <Button onClick={handleShareProfile} variant="outline" className="w-full border-border text-foreground hover:bg-secondary">
                      <Share2 className="mr-2 h-4 w-4" /> Share Profile
                    </Button>
                    {artist.user_id && user && (
                      <>
                        <Button onClick={() => setShowContactForm(!showContactForm)} variant="outline" className="w-full border-border text-foreground hover:bg-secondary">
                          <Mail className="mr-2 h-4 w-4" /> Contact Artist
                        </Button>
                        <Button onClick={() => setShowBookingForm(!showBookingForm)} variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
                          <CalendarDays className="mr-2 h-4 w-4" /> Book for Exhibition
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Contact Artist Form */}
              {showContactForm && !isOwner && (
                <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Contact Artist</h4>
                  <Input
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    placeholder="Subject (optional)"
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground text-sm"
                  />
                  <Textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Write your message..."
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    rows={3}
                  />
                  <Button onClick={handleContactArtist} disabled={sendingMessage || !contactMessage.trim()} size="sm" className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                    <Send className="mr-1 h-3 w-3" /> {sendingMessage ? "Sending..." : "Send Message"}
                  </Button>
                </div>
              )}

              {/* Book Exhibition Form */}
              {showBookingForm && !isOwner && (
                <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Exhibition Booking</h4>
                  <Textarea
                    value={bookingMessage}
                    onChange={(e) => setBookingMessage(e.target.value)}
                    placeholder="Describe the exhibition, venue, dates, and any details..."
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                    rows={4}
                  />
                  <Button onClick={handleBookExhibition} disabled={sendingMessage || !bookingMessage.trim()} size="sm" className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                    <Send className="mr-1 h-3 w-3" /> {sendingMessage ? "Sending..." : "Send Booking Request"}
                  </Button>
                </div>
              )}

              {/* Extended Info */}
              {!editing && (artist.full_biography || artist.education || artist.exhibitions || artist.awards) && (
                <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                  {artist.full_biography && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-1">Biography</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{artist.full_biography}</p>
                    </div>
                  )}
                  {artist.education && (
                    <div>
                      <h3 className="flex items-center gap-1 text-sm font-medium text-foreground mb-1"><GraduationCap className="h-3 w-3" /> Education</h3>
                      <p className="text-sm text-muted-foreground">{artist.education}</p>
                    </div>
                  )}
                  {artist.exhibitions && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-1">Exhibitions</h3>
                      <p className="text-sm text-muted-foreground">{artist.exhibitions}</p>
                    </div>
                  )}
                  {artist.awards && (
                    <div>
                      <h3 className="flex items-center gap-1 text-sm font-medium text-foreground mb-1"><Award className="h-3 w-3" /> Awards</h3>
                      <p className="text-sm text-muted-foreground">{artist.awards}</p>
                    </div>
                  )}
                </div>
              )}

              {!editing && !isOwner && <ArtistRating artistId={artist.id} />}
              {!editing && isOwner && <FollowersList artistId={artist.id} isOwner={isOwner} />}
            </div>

            {/* Right - Artworks Grid */}
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Artworks</h2>
              {artworks.length === 0 ? (
                <div className="mt-8 rounded-lg border border-border bg-card p-12 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">No artworks yet.</p>
                  {isOwner && (
                    <Button onClick={() => navigate("/sell")} className="mt-4 bg-gradient-gold text-primary-foreground shadow-gold">
                      Submit Your First Artwork
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {artworks.map((work, i) => (
                    <ArtworkCard
                      key={work.id}
                      artwork={{
                        id: work.id,
                        title: work.title,
                        artist: artist.name,
                        artistId: artist.id,
                        price: work.price,
                        medium: work.medium || "",
                        dimensions: work.dimensions || "",
                        year: work.year || 0,
                        category: work.category || "",
                        image: work.image_url || "/placeholder.svg",
                        description: work.description || "",
                        available: work.available,
                      }}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {isOwner && artist && (
        <VerificationDialog
          open={showVerification}
          onClose={() => setShowVerification(false)}
          artistId={artist.id}
          userId={user!.id}
          onVerified={() => setArtist(prev => prev ? { ...prev, verified: true, verification_status: "approved" } : prev)}
        />
      )}

      <Footer />
    </div>
  );
};

export default ArtistProfile;
