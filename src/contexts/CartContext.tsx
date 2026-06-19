import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface CartItem {
  id: string;
  artwork_id: string;
  artwork?: {
    id: string;
    title: string;
    price: number;
    image_url: string | null;
    artist_id: string | null;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (artworkId: string) => Promise<void>;
  removeFromCart: (artworkId: string) => Promise<void>;
  isInCart: (artworkId: string) => boolean;
  totalPrice: number;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("id, artwork_id, artworks(id, title, price, image_url, artist_id)")
      .eq("user_id", user.id);
    
    setItems(
      (data ?? []).map((item: any) => ({
        id: item.id,
        artwork_id: item.artwork_id,
        artwork: item.artworks,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (artworkId: string) => {
    if (!user) { toast.error("Please sign in to add items to cart"); return; }
    const { error } = await supabase
      .from("cart_items")
      .insert({ user_id: user.id, artwork_id: artworkId });
    if (error) {
      if (error.code === "23505") toast.info("Already in cart");
      else toast.error("Failed to add to cart");
      return;
    }
    toast.success("Added to cart");
    fetchCart();
  };

  const removeFromCart = async (artworkId: string) => {
    if (!user) return;
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("artwork_id", artworkId);
    toast.success("Removed from cart");
    fetchCart();
  };

  const clearCart = async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  };

  const isInCart = (artworkId: string) => items.some((i) => i.artwork_id === artworkId);

  const totalPrice = items.reduce((sum, i) => sum + (i.artwork?.price ?? 0), 0);

  return (
    <CartContext.Provider value={{ items, loading, addToCart, removeFromCart, isInCart, totalPrice, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
