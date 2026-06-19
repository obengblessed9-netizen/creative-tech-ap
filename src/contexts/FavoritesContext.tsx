import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FavoritesContextType {
  favorites: string[]; // artwork IDs
  isFavorite: (artworkId: string) => boolean;
  toggleFavorite: (artworkId: string) => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
};

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }
    const fetchFavorites = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("favorites")
        .select("artwork_id")
        .eq("user_id", user.id);
      setFavorites((data ?? []).map((f: any) => f.artwork_id));
      setLoading(false);
    };
    fetchFavorites();
  }, [user]);

  const isFavorite = (artworkId: string) => favorites.includes(artworkId);

  const toggleFavorite = async (artworkId: string) => {
    if (!user) {
      toast.error("Sign in to save favorites");
      return;
    }

    if (isFavorite(artworkId)) {
      setFavorites((prev) => prev.filter((id) => id !== artworkId));
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("artwork_id", artworkId);
      if (error) {
        setFavorites((prev) => [...prev, artworkId]);
        toast.error("Failed to remove from favorites");
      }
    } else {
      setFavorites((prev) => [...prev, artworkId]);
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, artwork_id: artworkId });
      if (error) {
        setFavorites((prev) => prev.filter((id) => id !== artworkId));
        toast.error("Failed to add to favorites");
      } else {
        toast.success("Added to favorites");
      }
    }
  };

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
};
