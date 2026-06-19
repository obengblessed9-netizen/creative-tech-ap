import { useState, useRef, useEffect } from "react";
import { Smartphone, CreditCard, Building2, Truck, Check, Download, Printer, Zap, Calendar, Hash, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type PaymentMethod = "mobile_money" | "card" | "bank_transfer" | "pay_on_delivery" | "paystack";
type MobileProvider = "mtn" | "vodafone" | "airteltigo";
type CardType = "visa" | "mastercard" | "verve";

interface ReceiptData {
  code: string;
  method: string;
  details: Record<string, string>;
  items: { title: string; price: number }[];
  total: number;
  date: string;
}

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AGMS-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const Payment = () => {
  const { items, totalPrice, clearCart } = useCart();
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [processing, setProcessing] = useState(false);
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Verify Paystack callback on return
  useEffect(() => {
    const url = new URL(window.location.href);
    const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
    if (!reference) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference } });
      if (error || !data?.success) {
        toast.error("Payment verification failed.");
      } else {
        toast.success(`Paystack payment confirmed (${data.reference})`);
        setReceipt({
          code: `AGMS-${data.reference.slice(-8).toUpperCase()}`,
          method: "Paystack",
          details: { Reference: data.reference, Currency: data.currency || "GHS" },
          items: items.map((i) => ({ title: i.artwork?.title ?? "Artwork", price: i.artwork?.price ?? 0 })),
          total: data.amount ?? totalPrice,
          date: new Date().toLocaleString(),
        });
        clearCart();
      }
      url.searchParams.delete("reference");
      url.searchParams.delete("trxref");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaystack = async () => {
    if (totalPrice <= 0) { toast.error("Your cart is empty."); return; }
    setPaystackLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: {
          amount: totalPrice,
          currency: "GHS",
          callback_url: `${window.location.origin}/payment`,
          metadata: { items: items.map((i) => ({ id: i.artwork?.id, title: i.artwork?.title })) },
        },
      });
      if (error || !data?.authorization_url) {
        toast.error(error?.message || "Could not start Paystack checkout.");
        setPaystackLoading(false);
        return;
      }
      window.location.href = data.authorization_url;
    } catch (e) {
      toast.error((e as Error).message);
      setPaystackLoading(false);
    }
  };

  // Form fields
  const [address, setAddress] = useState("");

  const getMethodLabel = (m: PaymentMethod) => {
    const map: Record<PaymentMethod, string> = {
      mobile_money: "Mobile Money",
      card: "Debit / Credit Card",
      bank_transfer: "Bank Transfer",
      pay_on_delivery: "Pay on Delivery",
      paystack: "Paystack",
    };
    return map[m];
  };

  const getPaymentDetails = (): Record<string, string> => {
    switch (method) {
      case "pay_on_delivery":
        return { "Delivery Address": address };
      default:
        return { Provider: "Paystack", Channels: "Card, MoMo, Bank" };
    }
  };

  const handleSubmit = async () => {
    if (method !== "pay_on_delivery") { 
      await handlePaystack(); 
      return; 
    }
    if (method === "pay_on_delivery" && !address) { toast.error("Please enter your delivery address."); return; }

    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));

    const receiptData: ReceiptData = {
      code: generateCode(),
      method: getMethodLabel(method),
      details: getPaymentDetails(),
      items: items.map((i) => ({ title: i.artwork?.title ?? "Artwork", price: i.artwork?.price ?? 0 })),
      total: totalPrice,
      date: new Date().toLocaleString(),
    };

    setReceipt(receiptData);
    toast.success("Payment submitted! Your receipt has been generated.");
    clearCart();
    setProcessing(false);
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Receipt ${receipt?.code}</title><style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:auto}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:6px 0;border-bottom:1px solid #eee}td:last-child{text-align:right}.total{font-weight:bold;font-size:1.1em;border-top:2px solid #333}.code{text-align:center;font-size:1.3em;font-weight:bold;margin:16px 0;padding:12px;border:2px dashed #666;letter-spacing:2px}</style></head><body>`);
    printWindow.document.write(receiptRef.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  const methods: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "paystack", label: "Paystack", icon: <Zap className="h-5 w-5" />, desc: "Pay securely with card, MoMo, or bank via Paystack." },
    { id: "mobile_money", label: "Mobile Money", icon: <Smartphone className="h-5 w-5" />, desc: "Fast and secure payments directly from your mobile wallet." },
    { id: "card", label: "Debit / Credit Card", icon: <CreditCard className="h-5 w-5" />, desc: "Safe online card payments with encrypted protection." },
    { id: "bank_transfer", label: "Bank Transfer", icon: <Building2 className="h-5 w-5" />, desc: "Direct transfer to our official business account." },
    { id: "pay_on_delivery", label: "Pay on Delivery", icon: <Truck className="h-5 w-5" />, desc: "Pay in cash when your order is delivered." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-24 pb-16 max-w-3xl">
        {receipt ? (
          <div className="mx-auto max-w-md space-y-6">
            {/* Inline Confirmation Summary */}
            <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-gold">
              <div ref={receiptRef} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500 ring-4 ring-green-500/10">
                  <Check className="h-8 w-8" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">Payment Successful</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your transaction has been completed via {receipt.method}.</p>

                <div className="mt-6 w-full space-y-3 rounded-xl bg-muted/40 p-4 text-left">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><Hash className="h-4 w-4" /> Reference</span>
                    <span className="font-mono text-sm font-semibold text-foreground">{receipt.details.Reference || receipt.code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><Receipt className="h-4 w-4" /> Amount Paid</span>
                    <span className="text-lg font-bold text-foreground">${receipt.total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> Date</span>
                    <span className="text-sm text-foreground">{receipt.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground"><Zap className="h-4 w-4" /> Method</span>
                    <span className="text-sm font-medium text-foreground">{receipt.method}</span>
                  </div>
                </div>

                <div className="mt-4 w-full">
                  <p className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Items Purchased</p>
                  <div className="space-y-2 rounded-xl bg-muted/30 p-3">
                    {receipt.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{item.title}</span>
                        <span className="font-medium text-foreground">${item.price.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-2 border-t border-border pt-2 flex items-center justify-between">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-display text-lg font-bold text-gradient-gold">${receipt.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex w-full gap-3">
                  <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                  <Button onClick={() => setReceipt(null)} className="flex-1 bg-gradient-gold text-primary-foreground hover:opacity-90">
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Payment</h1>
            <p className="text-muted-foreground mb-8">Choose your preferred payment method to complete your order.</p>

            {items.length > 0 && (
              <div className="mb-8 rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground mb-1">Order Total ({items.length} item{items.length > 1 ? "s" : ""})</p>
                <p className="font-display text-2xl font-bold text-gradient-gold">${totalPrice.toLocaleString()}</p>
                <Button
                  onClick={handlePaystack}
                  disabled={paystackLoading}
                  size="lg"
                  className="mt-4 w-full gap-2 bg-[#00C3F7] text-white hover:bg-[#00A8D6]"
                >
                  <Zap className="h-4 w-4" />
                  {paystackLoading ? "Redirecting to Paystack..." : "Pay with Paystack"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground text-center">Secure checkout powered by Paystack (cards, MoMo, bank).</p>
              </div>
            )}

        <div className="space-y-4">
          {methods.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => setMethod(m.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setMethod(m.id);
                }
              }}
              className={`w-full text-left rounded-xl border-2 p-5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                method === m.id ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${method === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {m.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{m.label}</p>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </div>
                {method === m.id && <Check className="h-5 w-5 text-primary" />}
              </div>

              {method === m.id && m.id === "mobile_money" && (
                <div className="mt-4 ml-13 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-muted-foreground italic">
                    You'll be redirected to Paystack's secure checkout for Mobile Money payment. Tap "Confirm Payment" to continue.
                  </p>
                </div>
              )}

              {method === m.id && m.id === "card" && (
                <div className="mt-4 ml-13 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-muted-foreground italic">
                    You'll be redirected to Paystack's secure checkout. Your card details are safely encrypted. Tap "Confirm Payment" to continue.
                  </p>
                </div>
              )}

              {method === m.id && m.id === "bank_transfer" && (
                <div className="mt-4 ml-13 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm text-muted-foreground italic">
                    You'll be redirected to Paystack to complete your secure bank transfer. Tap "Confirm Payment" to continue.
                  </p>
                </div>
              )}

              {method === m.id && m.id === "pay_on_delivery" && (
                <div className="mt-4 ml-13 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm text-muted-foreground">Delivery Address</Label>
                    <Input id="address" placeholder="Enter your delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground italic">Cash payment will be collected upon delivery. Please have the exact amount ready.</p>
                </div>
              )}

              {method === m.id && m.id === "paystack" && (
                <div className="mt-4 ml-13 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    {["Visa", "Mastercard", "Verve", "MTN MoMo", "Vodafone", "AirtelTigo", "Bank"].map((c) => (
                      <span key={c} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground">{c}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    You'll be redirected to Paystack's secure checkout. Tap "Confirm Payment" to continue.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={processing}
          size="lg"
          className="mt-8 w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
        >
          {processing ? "Processing..." : "Confirm Payment"}
        </Button>
      </>
    )}
  </main>

      <Footer />
    </div>
  );
};

export default Payment;
