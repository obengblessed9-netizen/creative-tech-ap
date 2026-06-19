import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Palette, Clock, CheckCircle, XCircle, ExternalLink,
  Camera, Upload, MapPin, Loader2, User, Phone, Home, CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";

interface Application {
  id: string;
  artist_name: string;
  first_name: string | null;
  last_name: string | null;
  age: number | null;
  location: string | null;
  shop_number: string | null;
  national_id_url: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  house_address: string | null;
  contact_phone: string | null;
  profile_picture_url: string | null;
  specialty: string | null;
  bio: string | null;
  portfolio_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface ArtistLink {
  id: string;
  name: string;
  verified: boolean;
}

type FormStep = "info" | "details" | "location" | "uploads" | "selfie" | "review";

const specializations = [
  "Painter", "Digital Artist", "Illustrator", "Sculptor", "Mixed Media Artist",
  "Photographer", "Printmaker", "Ceramicist", "Textile Artist", "Muralist",
];
const artStyleOptions = [
  "Abstract", "Realism", "Contemporary", "Impressionism", "Surrealism",
  "Minimalism", "Pop Art", "Expressionism", "Cubism", "Art Deco",
];
const mediumOptions = [
  "Oil", "Acrylic", "Watercolor", "Charcoal", "Digital", "3D",
  "Resin", "Wood", "Ink", "Pastel", "Mixed Media",
];

const STEPS: { key: FormStep; label: string }[] = [
  { key: "info", label: "Personal Info" },
  { key: "details", label: "Creative Details" },
  { key: "location", label: "Location" },
  { key: "uploads", label: "Documents" },
  { key: "selfie", label: "Face Verify" },
  { key: "review", label: "Review" },
];

const ArtistApplicationSection = () => {
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [artistLink, setArtistLink] = useState<ArtistLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>("info");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [houseAddress, setHouseAddress] = useState("");
  const [locationText, setLocationText] = useState("");
  const [shopNumber, setShopNumber] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Professional details
  const [artStyle, setArtStyle] = useState("");
  const [mediumUsed, setMediumUsed] = useState("");
  const [fullBiography, setFullBiography] = useState("");
  const [yearsActive, setYearsActive] = useState("");
  const [education, setEducation] = useState("");
  const [exhibitions, setExhibitions] = useState("");
  const [awards, setAwards] = useState("");
  const [tags, setTags] = useState("");

  // GPS
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // File uploads
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [nationalIdFile, setNationalIdFile] = useState<File | null>(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(null);

  // Webcam selfie
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [appRes, artistRes] = await Promise.all([
        supabase.from("artist_applications").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("artists").select("id, name, verified").eq("user_id", user.id).maybeSingle(),
      ]);
      if (appRes.data) setApplication(appRes.data as Application);
      if (artistRes.data) setArtistLink(artistRes.data as ArtistLink);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setSelfieData(canvas.toDataURL("image/jpeg", 0.8));
    stopCamera();
  };

  const getGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setGpsLoading(false);
        toast.success("GPS location captured!");
      },
      () => {
        toast.error("Could not get your location. Please allow location access.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "info":
        return !!firstName.trim() && !!lastName.trim() && !!contactPhone.trim();
      case "details":
        return true; // all optional
      case "location":
        return !!locationText.trim() && !!houseAddress.trim();
      case "uploads":
        return !!profilePicFile && !!nationalIdFile;
      case "selfie":
        return !!selfieData;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const idx = STEPS.findIndex((s) => s.key === currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].key);
  };

  const prevStep = () => {
    const idx = STEPS.findIndex((s) => s.key === currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
  };

  const handleSubmit = async () => {
    if (!user || !firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSubmitting(true);

    try {
      // Upload profile picture
      let profilePicUrl: string | null = null;
      if (profilePicFile) {
        const ext = profilePicFile.name.split(".").pop();
        const path = `${user.id}/profile-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("artwork-images").upload(path, profilePicFile, { contentType: profilePicFile.type });
        if (error) throw new Error("Failed to upload profile picture");
        const { data: urlData } = supabase.storage.from("artwork-images").getPublicUrl(path);
        profilePicUrl = urlData.publicUrl;
      }

      // Upload national ID
      let nationalIdUrl: string | null = null;
      if (nationalIdFile) {
        const ext = nationalIdFile.name.split(".").pop();
        const path = `${user.id}/national-id-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("verification-docs").upload(path, nationalIdFile, { contentType: nationalIdFile.type });
        if (error) throw new Error("Failed to upload national ID");
        nationalIdUrl = path;
      }

      // Run AI face verification if selfie + national ID exist
      let verificationPassed = false;
      if (selfieData && nationalIdFile) {
        const selfieB64 = selfieData.includes(",") ? selfieData.split(",")[1] : selfieData;
        const idReader = new FileReader();
        const idB64: string = await new Promise((resolve) => {
          idReader.onload = () => {
            const r = idReader.result as string;
            resolve(r.includes(",") ? r.split(",")[1] : r);
          };
          idReader.readAsDataURL(nationalIdFile);
        });

        if (!selfieB64 || !idB64) {
          toast.error("Selfie or ID image is empty. Please retake/re-upload.");
          setSubmitting(false);
          return;
        }

        // Upload selfie
        const selfieBlob = await fetch(selfieData).then((r) => r.blob());
        await supabase.storage.from("verification-docs").upload(
          `${user.id}/selfie-${Date.now()}.jpg`,
          selfieBlob,
          { contentType: "image/jpeg" }
        );

        const { data: aiResult, error: fnError } = await supabase.functions.invoke("verify-identity", {
          body: { selfie_base64: selfieB64, id_card_base64: idB64 },
        });

        if (fnError) {
          toast.error("Face verification failed. Please try again.");
          setSubmitting(false);
          return;
        }

        verificationPassed = aiResult.faces_match && aiResult.is_valid_id;
        if (!verificationPassed) {
          toast.error(aiResult.reason || "Face verification did not match your ID. Please retake your selfie.");
          setSubmitting(false);
          return;
        }
      }

      const artistName = `${firstName.trim()} ${lastName.trim()}`;
      const { data, error } = await supabase.from("artist_applications").insert({
        user_id: user.id,
        artist_name: artistName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        age: age ? parseInt(age) : null,
        specialty: specialty || null,
        bio: bio || null,
        portfolio_url: portfolioUrl || null,
        contact_phone: contactPhone.trim() || null,
        house_address: houseAddress.trim() || null,
        location: locationText.trim() || null,
        shop_number: shopNumber.trim() || null,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        national_id_url: nationalIdUrl,
        profile_picture_url: profilePicUrl,
        art_style: artStyle || null,
        medium_used: mediumUsed || null,
        full_biography: fullBiography.trim() || null,
        years_active: yearsActive ? parseInt(yearsActive) : null,
        education: education.trim() || null,
        exhibitions: exhibitions.trim() || null,
        awards: awards.trim() || null,
        tags: tags.trim() ? tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
      }).select().single();

      if (error) {
        toast.error(error.message.includes("unique") ? "You already have an application" : "Failed to submit");
      } else {
        setApplication(data as Application);
        toast.success("Application submitted! An admin will review it.");
        setShowForm(false);
        stopCamera();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }

    setSubmitting(false);
  };

  if (loading) return null;

  // User already has an artist profile
  if (artistLink) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-avatar-ring bg-avatar-ring/20 shadow-[0_0_12px_hsl(var(--avatar-ring)/0.4)]">
            <Palette className="h-5 w-5 text-avatar-ring" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">Artist Profile</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          You're registered as <span className="text-foreground font-medium">{artistLink.name}</span>.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
          <Link to={`/artist/${artistLink.id}`}>
            <ExternalLink className="mr-1 h-3 w-3" /> View Artist Profile
          </Link>
        </Button>
      </div>
    );
  }

  // Has existing application
  if (application) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-avatar-ring bg-avatar-ring/20 shadow-[0_0_12px_hsl(var(--avatar-ring)/0.4)]">
              <Palette className="h-5 w-5 text-avatar-ring" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground">Artist Application</h3>
          </div>
          {application.status === "pending" && (
            <Badge variant="outline" className="border-primary/30 text-primary"><Clock className="mr-1 h-3 w-3" />Pending Review</Badge>
          )}
          {application.status === "approved" && (
            <Badge className="bg-primary/20 text-primary"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>
          )}
          {application.status === "rejected" && (
            <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>
          )}
        </div>
        <div className="mt-3 text-sm text-muted-foreground space-y-1">
          <p>Name: <span className="text-foreground">{application.first_name} {application.last_name}</span></p>
          {application.specialty && <p>Specialty: {application.specialty}</p>}
          {application.contact_phone && <p>Contact: {application.contact_phone}</p>}
          <p>Submitted: {new Date(application.created_at).toLocaleDateString()}</p>
          {application.admin_notes && (
            <p className="mt-2 rounded bg-secondary p-2 text-foreground">Admin: {application.admin_notes}</p>
          )}
        </div>
      </div>
    );
  }

  // No application yet — multi-step form
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-avatar-ring bg-avatar-ring/20 shadow-[0_0_12px_hsl(var(--avatar-ring)/0.4)]">
          <Palette className="h-5 w-5 text-avatar-ring" />
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground">Become an Artist</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Apply to become a verified artist on our platform and start selling your artwork.
      </p>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="mt-4 bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
          Apply as Artist
        </Button>
      ) : (
        <div className="mt-4">
          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-1">
            {STEPS.map((s, i) => {
              const isActive = s.key === currentStep;
              const isDone = STEPS.findIndex((x) => x.key === currentStep) > i;
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`h-2 w-full rounded-full transition-colors ${isActive ? "bg-primary" : isDone ? "bg-avatar-ring" : "bg-muted"}`} />
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
                </div>
              );
            })}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Step: Personal Info */}
          {currentStep === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground"><User className="mr-1 inline h-3 w-3" />First Name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="mt-1 bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Last Name *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="mt-1 bg-secondary border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground">Age</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className="mt-1 bg-secondary border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground"><Phone className="mr-1 inline h-3 w-3" />Phone *</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555-0123" className="mt-1 bg-secondary border-border text-foreground" />
                </div>
              </div>
              <div>
                <Label className="text-foreground">Portfolio URL</Label>
                <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-portfolio.com" className="mt-1 bg-secondary border-border text-foreground" />
              </div>
            </div>
          )}

          {/* Step: Professional / Creative Details */}
          {currentStep === "details" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="text-foreground">Art Specialization</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger className="mt-1 bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Art Style</Label>
                  <Select value={artStyle} onValueChange={setArtStyle}>
                    <SelectTrigger className="mt-1 bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      {artStyleOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Medium Used</Label>
                  <Select value={mediumUsed} onValueChange={setMediumUsed}>
                    <SelectTrigger className="mt-1 bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Select medium" />
                    </SelectTrigger>
                    <SelectContent>
                      {mediumOptions.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="appBio" className="text-foreground">Short Bio</Label>
                <Textarea id="appBio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A brief introduction about yourself and your art..." rows={2} className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>

              <div>
                <Label htmlFor="appFullBio" className="text-foreground">Full Biography</Label>
                <Textarea id="appFullBio" value={fullBiography} onChange={(e) => setFullBiography(e.target.value)} placeholder="Your career journey, inspirations, and artistic philosophy..." rows={4} className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="appYears" className="text-foreground">Years Active</Label>
                  <Input id="appYears" type="number" min="0" value={yearsActive} onChange={(e) => setYearsActive(e.target.value)} placeholder="e.g. 5" className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor="appEdu" className="text-foreground">Education / Training</Label>
                  <Input id="appEdu" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. BFA, Kwame Nkrumah University" className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="appExhibitions" className="text-foreground">Exhibitions</Label>
                  <Textarea id="appExhibitions" value={exhibitions} onChange={(e) => setExhibitions(e.target.value)} placeholder="List exhibitions you've participated in..." rows={2} className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor="appAwards" className="text-foreground">Awards / Recognitions</Label>
                  <Textarea id="appAwards" value={awards} onChange={(e) => setAwards(e.target.value)} placeholder="List any awards or recognitions..." rows={2} className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
              </div>

              <div>
                <Label htmlFor="appTags" className="text-foreground">Tags / Keywords</Label>
                <Input id="appTags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. portrait, landscape, african art (comma-separated)" className="mt-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Separate with commas for search visibility</p>
              </div>
            </div>
          )}

          {/* Step: Location */}
          {currentStep === "location" && (
            <div className="space-y-4">
              <div>
                <Label className="text-foreground"><MapPin className="mr-1 inline h-3 w-3" />City / Region *</Label>
                <Input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="e.g. Nairobi, Kenya" className="mt-1 bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground"><Home className="mr-1 inline h-3 w-3" />House Address *</Label>
                <Input value={houseAddress} onChange={(e) => setHouseAddress(e.target.value)} placeholder="123 Art Street, Suite 4B" className="mt-1 bg-secondary border-border text-foreground" />
              </div>
              <div>
                <Label className="text-foreground">Workshop / Shop Number</Label>
                <Input value={shopNumber} onChange={(e) => setShopNumber(e.target.value)} placeholder="Shop #12" className="mt-1 bg-secondary border-border text-foreground" />
              </div>

              {/* GPS */}
              <div className="rounded-lg border border-border bg-secondary p-4">
                <Label className="text-foreground mb-2 block"><MapPin className="mr-1 inline h-3 w-3" />GPS Location of Art Workshop</Label>
                {gpsLat && gpsLng ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-avatar-ring" />
                    <span className="text-sm text-foreground">{gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setGpsLat(null); setGpsLng(null); }} className="ml-auto text-muted-foreground">Reset</Button>
                  </div>
                ) : (
                  <Button onClick={getGpsLocation} disabled={gpsLoading} variant="outline" className="w-full border-primary/30 text-primary">
                    {gpsLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Getting location...</> : <><MapPin className="mr-2 h-4 w-4" />Capture GPS Location</>}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step: Document Uploads */}
          {currentStep === "uploads" && (
            <div className="space-y-4">
              {/* Profile Picture */}
              <div>
                <Label className="text-foreground mb-2 block"><Camera className="mr-1 inline h-3 w-3" />Profile Picture *</Label>
                {profilePicPreview ? (
                  <div className="space-y-2">
                    <img src={profilePicPreview} alt="Profile preview" className="h-32 w-32 rounded-full border-[3px] border-avatar-ring object-cover shadow-[0_0_12px_hsl(var(--avatar-ring)/0.4)]" />
                    <Button variant="ghost" size="sm" onClick={() => { setProfilePicFile(null); setProfilePicPreview(null); }} className="text-muted-foreground">Change</Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload your profile picture</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, setProfilePicFile, setProfilePicPreview)} />
                  </label>
                )}
              </div>

              {/* National ID */}
              <div>
                <Label className="text-foreground mb-2 block"><CreditCard className="mr-1 inline h-3 w-3" />National ID Card *</Label>
                {nationalIdPreview ? (
                  <div className="space-y-2">
                    <img src={nationalIdPreview} alt="National ID preview" className="w-full max-h-48 rounded-lg border border-border object-contain" />
                    <Button variant="ghost" size="sm" onClick={() => { setNationalIdFile(null); setNationalIdPreview(null); }} className="text-muted-foreground">Change</Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload your national ID card</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG up to 10MB</p>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, setNationalIdFile, setNationalIdPreview)} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step: Webcam Face Verification */}
          {currentStep === "selfie" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Take a live selfie to verify you match your national ID photo. This is required for human authentication.
              </p>
              {cameraActive ? (
                <div className="space-y-3">
                  <video ref={videoRef} className="w-full rounded-lg border border-border" autoPlay muted playsInline />
                  <Button onClick={captureSelfie} className="w-full bg-gradient-gold text-primary-foreground shadow-gold">
                    <Camera className="mr-2 h-4 w-4" /> Capture Selfie
                  </Button>
                </div>
              ) : selfieData ? (
                <div className="space-y-3">
                  <img src={selfieData} alt="Selfie preview" className="w-full rounded-lg border border-border" />
                  <Button variant="outline" onClick={() => { setSelfieData(null); startCamera(); }} className="w-full border-border text-foreground">
                    Retake Selfie
                  </Button>
                </div>
              ) : (
                <Button onClick={startCamera} className="w-full bg-gradient-gold text-primary-foreground shadow-gold">
                  <Camera className="mr-2 h-4 w-4" /> Open Camera
                </Button>
              )}
            </div>
          )}

          {/* Step: Review */}
          {currentStep === "review" && (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-foreground">Review your application:</p>
              <div className="rounded-lg bg-secondary p-4 space-y-2 text-muted-foreground">
                <p>Name: <span className="text-foreground">{firstName} {lastName}</span></p>
                {age && <p>Age: <span className="text-foreground">{age}</span></p>}
                <p>Phone: <span className="text-foreground">{contactPhone}</span></p>
                {specialty && <p>Specialization: <span className="text-foreground">{specialty}</span></p>}
                {artStyle && <p>Art Style: <span className="text-foreground">{artStyle}</span></p>}
                {mediumUsed && <p>Medium: <span className="text-foreground">{mediumUsed}</span></p>}
                {bio && <p>Bio: <span className="text-foreground">{bio}</span></p>}
                {yearsActive && <p>Years Active: <span className="text-foreground">{yearsActive}</span></p>}
                {education && <p>Education: <span className="text-foreground">{education}</span></p>}
                {tags && <p>Tags: <span className="text-foreground">{tags}</span></p>}
                <p>Location: <span className="text-foreground">{locationText}</span></p>
                <p>Address: <span className="text-foreground">{houseAddress}</span></p>
                {shopNumber && <p>Shop #: <span className="text-foreground">{shopNumber}</span></p>}
                {gpsLat && gpsLng && <p>GPS: <span className="text-foreground">{gpsLat.toFixed(4)}, {gpsLng.toFixed(4)}</span></p>}
                <p>Profile Picture: <span className="text-foreground">{profilePicFile ? "✓ Uploaded" : "—"}</span></p>
                <p>National ID: <span className="text-foreground">{nationalIdFile ? "✓ Uploaded" : "—"}</span></p>
                <p>Selfie: <span className="text-foreground">{selfieData ? "✓ Captured" : "—"}</span></p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex gap-3">
            {currentStep !== "info" && (
              <Button variant="outline" onClick={prevStep} className="border-border text-foreground">
                Back
              </Button>
            )}
            {currentStep !== "review" ? (
              <Button onClick={nextStep} disabled={!canProceed()} className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying & Submitting...</> : "Submit Application"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setShowForm(false); stopCamera(); }} className="ml-auto text-muted-foreground">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistApplicationSection;
