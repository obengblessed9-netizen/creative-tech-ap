import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingBag, LogOut, UserCircle, DollarSign, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import CartDrawer from "@/components/CartDrawer";
import NotificationsBell from "@/components/NotificationsBell";
import { ModeToggle } from "@/components/ModeToggle";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Gallery", path: "/gallery" },
  { label: "Artists", path: "/artists" },
  { label: "Live", path: "/live" },
  { label: "Payment", path: "/payment" },
];

// "Sell" is a separate top-corner action, not part of navLinks

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { items } = useCart();

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("read", false);
      setUnreadMessages(count ?? 0);
    };
    fetchUnread();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("navbar-messages")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `recipient_id=eq.${user.id}`,
      }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold tracking-wide text-gradient-gold">
            AGMS
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium tracking-wider uppercase transition-colors hover:text-primary ${
                  location.pathname === link.path ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user && (
              <Button asChild size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold uppercase tracking-wider text-xs px-5">
                <Link to="/submit"><DollarSign className="mr-1 h-3.5 w-3.5" /> Sell</Link>
              </Button>
            )}
            {user && (
              <Button asChild variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
                <Link to="/messages">
                  <Mail className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </Button>
            )}
            <ModeToggle />
            {user && <NotificationsBell />}
            {user && (
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary" onClick={() => setCartOpen(true)}>
                <ShoppingBag className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {items.length}
                  </span>
                )}
              </Button>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon" className="rounded-full border-2 border-avatar-ring hover:bg-avatar-ring/10 h-9 w-9">
                  <Link to="/profile"><UserCircle className="h-5 w-5 text-avatar-ring" /></Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="mr-1 h-4 w-4" /> Sign Out
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Button asChild variant="ghost" size="icon" className="relative text-muted-foreground">
                <Link to="/messages">
                  <Mail className="h-5 w-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </Button>
            )}
            <ModeToggle />
            {user && (
              <Button variant="ghost" size="icon" className="relative text-muted-foreground" onClick={() => setCartOpen(true)}>
                <ShoppingBag className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {items.length}
                  </span>
                )}
              </Button>
            )}
            <button className="text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-background px-6 py-4 md:hidden animate-fade-in">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} onClick={() => setMobileOpen(false)}
                className={`block py-3 text-sm font-medium tracking-wider uppercase ${location.pathname === link.path ? "text-primary" : "text-muted-foreground"}`}>
                {link.label}
              </Link>
            ))}
            {user && (
              <Link to="/submit" onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm font-bold tracking-wider uppercase text-destructive">
                Sell
              </Link>
            )}
            <div className="mt-3 border-t border-border pt-3">
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => { handleSignOut(); setMobileOpen(false); }} className="text-muted-foreground">
                  <LogOut className="mr-1 h-4 w-4" /> Sign Out
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="border-primary/30 text-primary">
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
};

export default Navbar;
