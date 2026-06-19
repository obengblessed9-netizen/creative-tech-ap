import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCircle, ImagePlus, Upload, ArrowRight } from "lucide-react";

const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];

const CreateProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [artistName, setArtistName] = useState("");
  const [realName, setRealName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingProfile, setExistingProfile] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      checkExistingProfile();
    }
  }, [user]);

  const checkExistingProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setExistingProfile(true);
    }
    setCheckingProfile(false);
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate required fields
    if (!artistName.trim()) {
      toast.error("Artist name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email address is required");
      return;
    }
    if (!city.trim()) {
      toast.error("City is required");
      return;
    }
    if (!country.trim()) {
      toast.error("Country is required");
      return;
    }
    setSubmitting(true);

    try {
      let imageUrl: string | null = null;

      if (profilePicFile) {
        const ext = profilePicFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(path, profilePicFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("profile-pictures")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const cleanUsername = username.trim() || null;

      if (cleanUsername) {
        const { data: existing } = await supabase
          .from("artists")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();
        if (existing) {
          toast.error("That username is already taken. Please pick another.");
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from("artists").insert({
        user_id: user.id,
        name: artistName.trim(),
        real_name: realName.trim() || null,
        username: cleanUsername,
        email: email.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        image_url: imageUrl,
      });

      if (error) throw error;
      toast.success("Artist profile created successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      if (err?.code === "23505" && String(err?.message ?? "").includes("username")) {
        toast.error("That username is already taken. Please pick another.");
      } else {
        toast.error(err.message || "Failed to create profile");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-20 container max-w-2xl text-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (existingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-20 container max-w-2xl text-center">
          <UserCircle className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Profile Already Exists</h1>
          <p className="text-muted-foreground mb-6">You already have an artist profile. You can edit it from your dashboard.</p>
          <Button onClick={() => navigate("/dashboard")} className="bg-gradient-gold text-primary-foreground">
            Go to Dashboard
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-foreground">Create a Profile</h1>
          <p className="mt-1 text-muted-foreground">Set up your artist profile to start showcasing and selling your work.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <Label className="text-foreground mb-3">Profile Picture</Label>
              <label className="cursor-pointer group">
                {profilePicPreview ? (
                  <div className="relative">
                    <img
                      src={profilePicPreview}
                      alt="Profile preview"
                      className="h-32 w-32 rounded-full object-cover border-4 border-avatar-ring shadow-gold"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImagePlus className="h-8 w-8 text-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-dashed border-border bg-secondary/50 transition-colors group-hover:border-primary/50">
                    <ImagePlus className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">Professional portrait or logo</p>
            </div>

            {/* Artist Name & Real Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="artistName" className="text-foreground">Artist Name / Brand Name *</Label>
                <Input
                  id="artistName"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                  placeholder="Your artist or brand name"
                  className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="realName" className="text-foreground">Real Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="realName"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="Your legal name"
                  className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-foreground">Username <span className="text-muted-foreground text-xs">(unique handle)</span></Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="e.g. artbyalice"
                className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-secondary border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-foreground">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 890"
                  className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="city" className="text-foreground">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Accra"
                  className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="country" className="text-foreground">Country *</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Ghana"
                  className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* DOB & Gender */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dob" className="text-foreground">Date of Birth <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 bg-secondary border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-foreground">Gender <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="mt-1 bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? "Creating Profile..." : "Create Profile"}
            </Button>

            <div className="border-t border-border pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Want to sell your art and get verified?</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/profile")}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                Apply as Artist <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateProfile;
