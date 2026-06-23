import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { Printer, ShoppingBag, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd for date input

const ARTWORK_TYPES = ["Digital Illustration", "Painting (Traditional)", "Drawing / Sketch", "Other"];
const ORIENTATIONS = ["Portrait", "Landscape", "Square"];

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei",
  "Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde",
  "Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo",
  "Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti",
  "Dominican Republic","Ecuador","Egypt","El Salvador","Eritrea","Estonia","Eswatini",
  "Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
  "Greece","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica",
  "Japan","Jordan","Kazakhstan","Kenya","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon",
  "Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia",
  "Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea",
  "North Macedonia","Norway","Oman","Pakistan","Panama","Papua New Guinea","Paraguay",
  "Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda",
  "Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan",
  "Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo",
  "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda","Ukraine",
  "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

const OrderDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, isInCart } = useCart();
  
  const [artwork, setArtwork] = useState<any>(location.state?.artwork || null);
  const [loading, setLoading] = useState(!artwork);

  useEffect(() => {
    if (!artwork && id) {
      const fetchArtwork = async () => {
        const { data } = await supabase
          .from("artworks")
          .select("*")
          .eq("id", id)
          .single();
        if (data) setArtwork(data);
        setLoading(false);
      };
      fetchArtwork();
    }
  }, [id, artwork]);

  const alreadyInCart = artwork ? isInCart(artwork.id) : false;
  const [ordering, setOrdering] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderDate, setOrderDate] = useState(today);
  const [contactEmail, setContactEmail] = useState(false);
  const [contactWhatsApp, setContactWhatsApp] = useState(false);
  const [contactPhone, setContactPhone] = useState(false);
  const [country, setCountry] = useState("");
  const [town, setTown] = useState("");
  const [street, setStreet] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const [artworkType, setArtworkType] = useState("Digital Illustration");
  const [artworkTypeOther, setArtworkTypeOther] = useState("");
  const [stylePreference, setStylePreference] = useState("");
  const [size, setSize] = useState("");
  const [orientation, setOrientation] = useState("Portrait");
  const [purpose, setPurpose] = useState("");

  const [artDescription, setArtDescription] = useState("");
  const [refFiles, setRefFiles] = useState<File[]>([]);

  const [textToInclude, setTextToInclude] = useState("");
  const [frameYes, setFrameYes] = useState(false);
  const [frameNo, setFrameNo] = useState(false);
  const [colorPreferences, setColorPreferences] = useState("");
  const [anythingElse, setAnythingElse] = useState("");

  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [rushYes, setRushYes] = useState(false);
  const [rushNo, setRushNo] = useState(false);

  const handleConfirmOrder = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate("/auth");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!country.trim()) {
      toast.error("Please select your country");
      return;
    }
    setOrdering(true);
    await addToCart(artwork.id);
    setOrdering(false);
    toast.success(`"${artwork.title}" added to cart!`);
    window.dispatchEvent(new CustomEvent("open-cart-drawer"));
    navigate("/gallery");
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-24"><p>Loading...</p></div>
        <Footer />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center pt-24 gap-4">
          <p>Artwork not found.</p>
          <Link to="/gallery" className="text-primary hover:underline">Return to Gallery</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="print-hidden">
        <Navbar />
      </div>
      
      <main className="flex-1 container pt-24 pb-20 printable-area">
        <div className="print-hidden mb-6 flex justify-between items-center">
          <Link to="/gallery" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Gallery
          </Link>
          <div className="flex gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c9a884] bg-[#fdf3e0] text-sm text-[#8a6028] font-medium hover:bg-[#faebce] transition-colors"
            >
              <Printer size={15} /> Print Form
            </button>
            <button
              onClick={handleConfirmOrder}
              disabled={ordering || alreadyInCart}
              className="flex items-center gap-2 px-6 py-2 rounded-lg border-none bg-gradient-to-br from-[#c9a84c] to-[#e8c96a] text-sm text-white font-semibold shadow-md disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <ShoppingBag size={15} /> {alreadyInCart ? "In Cart" : ordering ? "Adding…" : "Confirm Order"}
            </button>
          </div>
        </div>

        {/* ── Form Container ─────────────────────────────── */}
        <div className="mx-auto max-w-4xl bg-[#fffdf9] text-[#1a1a1a] shadow-xl rounded-2xl overflow-hidden print-shadow-none print-rounded-none">
          <div className="p-8 md:p-12 font-inter">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="font-serif text-3xl font-bold tracking-[0.2em] uppercase text-center text-black">
                  Order Details Form
                </h1>
                <p className="text-center text-[11px] tracking-[0.4em] text-gray-500 uppercase mt-1">
                  Artwork Request
                </p>
                <hr className="border-t border-[#c9a884] my-3 mx-auto w-1/2" />
              </div>
              <div className="ml-6 border border-[#e2c9a0] rounded-xl px-4 py-3 bg-[#fdf8f0] min-w-[180px] text-center hidden md:block">
                {artwork.image || artwork.image_url ? (
                  <img src={artwork.image || artwork.image_url} alt={artwork.title} className="w-12 h-12 object-cover rounded-md mx-auto mb-2" />
                ) : null}
                <p className="text-[11px] text-gray-500 italic">Let's create something<br />beautiful together.</p>
                <p className="text-lg text-[#c9a884] mt-1">♡</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Thank you for your interest! Please provide the details below so I can create artwork that brings your vision to life.
            </p>

            {/* ── 1. CLIENT INFORMATION ────────────────────────── */}
            <Section title="1. Client Information">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <FormField label="Full Name">
                    <input className="form-input-line" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                  </FormField>
                  <FormField label="Email Address">
                    <input className="form-input-line" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
                  </FormField>
                  <FormField label="Phone Number">
                    <input className="form-input-line" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                  </FormField>
                </div>
                <div>
                  <FormField label="Order Date">
                    <input
                      type="date"
                      className="form-input-line"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                  </FormField>
                  <div className="mt-3">
                    <p className="form-label-text">Preferred Contact Method:</p>
                    <div className="flex gap-4 mt-1.5 flex-wrap">
                      {[
                        { label: "Email", val: contactEmail, set: setContactEmail },
                        { label: "WhatsApp", val: contactWhatsApp, set: setContactWhatsApp },
                        { label: "Phone Call", val: contactPhone, set: setContactPhone },
                      ].map(({ label, val, set }) => (
                        <label key={label} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="accent-[#3a3fa0]" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Country selector */}
                  <FormField label="Country" className="mt-3">
                    <div className="relative">
                      <div
                        className="form-input-line flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setCountryOpen((o) => !o)}
                      >
                        <span className={country ? "text-[#1a1a1a]" : "text-gray-400"}>
                          {country || "Select your country"}
                        </span>
                        <span className="text-gray-400 text-xs">▾</span>
                      </div>
                      {countryOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[#c9a884] rounded-lg shadow-lg max-h-52 overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-[#e8d5b7]">
                            <input
                              autoFocus
                              className="w-full text-xs outline-none border border-[#c9a884] rounded px-2 py-1"
                              placeholder="Search country..."
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                            />
                          </div>
                          <div className="overflow-y-auto">
                            {filteredCountries.map((c) => (
                              <div
                                key={c}
                                onClick={() => { setCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                                className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-[#fdf8f0] ${
                                  country === c ? "bg-[#f5ede0] font-semibold text-[#6b4c2a]" : "text-[#1a1a1a]"
                                }`}
                              >
                                {c}
                              </div>
                            ))}
                            {filteredCountries.length === 0 && (
                              <p className="text-xs text-gray-400 px-3 py-2">No country found</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormField>
                  {/* Town / City */}
                  <FormField label="Town / City" className="mt-3">
                    <input
                      className="form-input-line"
                      value={town}
                      onChange={(e) => setTown(e.target.value)}
                      placeholder="e.g. Accra, London, New York"
                    />
                  </FormField>
                  {/* Street */}
                  <FormField label="Street / Area (if applicable)" className="mt-3">
                    <input
                      className="form-input-line"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. 12 Main Street"
                    />
                  </FormField>
                </div>
              </div>
            </Section>

            {/* ── 2. ARTWORK DETAILS ──────────────────────────── */}
            <Section title="2. Artwork Details">
              <FormField label="Type of Artwork Requested:">
                <div className="flex gap-4 flex-wrap mt-1">
                  {ARTWORK_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" name="artworkType" checked={artworkType === t} onChange={() => setArtworkType(t)} className="accent-[#3a3fa0]" />
                      {t === "Other" ? (
                        <span className="flex items-center gap-1">
                          Other: <input value={artworkTypeOther} onChange={(e) => setArtworkTypeOther(e.target.value)} className="border-b border-gray-300 outline-none w-20 text-xs text-[#3a3fa0] bg-transparent" />
                        </span>
                      ) : t}
                    </label>
                  ))}
                </div>
              </FormField>
              <FormField label="Medium / Style Preference:">
                <input className="form-input-line" value={stylePreference} onChange={(e) => setStylePreference(e.target.value)} placeholder="e.g. Watercolor style" />
              </FormField>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField label="Size / Dimensions (cm/inches):">
                  <input className="form-input-line" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. A3 (29.7 × 42 cm)" />
                </FormField>
                <FormField label="Orientation:">
                  <div className="flex gap-4 flex-wrap mt-1">
                    {ORIENTATIONS.map((o) => (
                      <label key={o} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="orientation" checked={orientation === o} onChange={() => setOrientation(o)} className="accent-[#3a3fa0]" />
                        {o}
                      </label>
                    ))}
                  </div>
                </FormField>
              </div>
              <FormField label="Purpose (e.g., gift, home decor, branding, etc.):">
                <input className="form-input-line" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Describe the purpose" />
              </FormField>
            </Section>

            {/* ── 3. DESCRIPTION OF ARTWORK ────────────────────── */}
            <Section title="3. Description of Artwork">
              <p className="text-xs text-gray-500 mb-2 leading-tight">
                Please describe your idea in as much detail as possible.<br />
                Include the subject, background, mood, colors, and any specific elements you want.
              </p>
              <textarea
                value={artDescription}
                onChange={(e) => setArtDescription(e.target.value)}
                placeholder="I would like a watercolor painting of..."
                rows={4}
                className="form-input-line w-full resize-y"
              />
            </Section>

            {/* ── 4 & 5 side-by-side ────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="border border-[#c9a884] rounded-lg overflow-hidden">
                <div className="bg-[#f5ede0] px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#6b4c2a]">4. Reference Images (if any)</div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3 leading-tight">
                    Please attach or share any reference images that can help bring your idea to life.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c9a884] border-2 border-dashed border-[#c9a884] rounded-lg px-3 py-2 hover:bg-[#fdf8f0] transition-colors">
                    <span className="text-lg">📎</span>
                    <span>{refFiles.length > 0 ? `Attached ${refFiles.length} image(s).` : "Click to attach images"}</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setRefFiles(Array.from(e.target.files ?? []))} />
                  </label>
                </div>
              </div>

              <div className="border border-[#c9a884] rounded-lg overflow-hidden">
                <div className="bg-[#f5ede0] px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#6b4c2a]">5. Additional Preferences</div>
                <div className="p-4">
                  <FormField label="Text to Include (if any):">
                    <input className="form-input-line" value={textToInclude} onChange={(e) => setTextToInclude(e.target.value)} placeholder="None" />
                  </FormField>
                  <FormField label="Frame Preference:" className="mt-2">
                    <div className="flex gap-4 mt-1">
                      {[
                        { label: "Yes", val: frameYes, set: setFrameYes, other: setFrameNo },
                        { label: "No", val: frameNo, set: setFrameNo, other: setFrameYes },
                      ].map(({ label, val, set, other }) => (
                        <label key={label} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={val} onChange={(e) => { set(e.target.checked); if (e.target.checked) other(false); }} className="accent-[#3a3fa0]" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Color Preferences:" className="mt-2">
                    <input className="form-input-line" value={colorPreferences} onChange={(e) => setColorPreferences(e.target.value)} placeholder="e.g. Pastel pinks, blues..." />
                  </FormField>
                  <FormField label="Anything Else You'd Like Me to Know?" className="mt-2">
                    <input className="form-input-line" value={anythingElse} onChange={(e) => setAnythingElse(e.target.value)} placeholder="Any extra notes..." />
                  </FormField>
                </div>
              </div>
            </div>

            {/* ── 6. BUDGET & TIMELINE ──────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-[#c9a884] rounded-lg overflow-hidden">
                <div className="bg-[#f5ede0] px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#6b4c2a]">6. Budget & Timeline</div>
                <div className="p-4">
                  <FormField label="Budget Range (USD):">
                    <div className="flex gap-2 items-center text-xs">
                      <span>$</span>
                      <input className="form-input-line flex-1" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="100" />
                      <span>–</span>
                      <span>$</span>
                      <input className="form-input-line flex-1" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="500" />
                    </div>
                  </FormField>
                  <FormField label="Expected Completion Date:" className="mt-2">
                    <input type="date" className="form-input-line" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} />
                  </FormField>
                  <FormField label="Rush Order:" className="mt-2">
                    <div className="flex gap-4 mt-1">
                      {[
                        { label: "Yes", val: rushYes, set: setRushYes, other: setRushNo },
                        { label: "No", val: rushNo, set: setRushNo, other: setRushYes },
                      ].map(({ label, val, set, other }) => (
                        <label key={label} className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={val} onChange={(e) => { set(e.target.checked); if (e.target.checked) other(false); }} className="accent-[#3a3fa0]" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>
              </div>
              <div className="border border-[#c9a884] rounded-lg bg-[#fdf8f0] p-6 flex flex-col items-center justify-center text-center">
                <p className="text-xl text-[#c9a884]">♡</p>
                <p className="font-semibold text-base mt-2">Thank you!</p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  I appreciate your trust and can't wait to create something special for you.
                </p>
              </div>
            </div>

          </div>
        </div>

      </main>
      
      <div className="print-hidden mt-auto">
        <Footer />
      </div>

    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border border-[#c9a884] rounded-lg overflow-hidden mb-4">
    <div className="bg-[#f5ede0] px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#6b4c2a]">{title}</div>
    <div className="p-4">{children}</div>
  </div>
);

const FormField = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`mb-2 ${className || ""}`}>
    <p className="form-label-text">{label}</p>
    {children}
  </div>
);

export default OrderDetails;
