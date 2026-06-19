import { Link } from "react-router-dom";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const { items, removeFromCart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const handleCheckout = () => {
    toast.success("Order placed successfully! Thank you for your purchase.");
    clearCart();
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-card shadow-xl animate-fade-in">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Cart ({items.length})
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 && (
              <p className="text-center text-muted-foreground pt-10">Your cart is empty</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
                {item.artwork?.image_url && (
                  <img src={item.artwork.image_url} alt={item.artwork?.title} className="h-16 w-16 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.artwork?.title}</p>
                  <p className="text-sm text-primary">${item.artwork?.price?.toLocaleString()}</p>
                </div>
                <button onClick={() => removeFromCart(item.artwork_id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {items.length > 0 && (
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-foreground font-medium">Total</span>
                <span className="font-display text-lg font-bold text-gradient-gold">${totalPrice.toLocaleString()}</span>
              </div>
              <Button onClick={handleCheckout} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90">
                Checkout
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
