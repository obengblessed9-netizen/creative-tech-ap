import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Pencil, Trash2, MoreHorizontal, Plus } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ArtworkCardData {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  price: number;
  medium: string;
  dimensions: string;
  year: number;
  category: string;
  image: string;
  description: string;
  available: boolean;
}

interface ArtworkCardProps {
  artwork: ArtworkCardData;
  index?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ArtworkCard = ({ artwork, index = 0, onEdit, onDelete }: ArtworkCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const favorited = isFavorite(artwork.id);
  const alreadyInCart = isInCart(artwork.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(artwork.id);
  };

  const handlePlaceOrderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate("/auth");
      return;
    }
    if (!artwork.available) {
      toast.error("This artwork is sold out");
      return;
    }
    navigate(`/order/${artwork.id}`, { state: { artwork } });
  };

  return (
    <div
      className="group block animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Link to={`/artwork/${artwork.id}`} className="relative block overflow-hidden rounded-lg bg-card">
        <div className="aspect-[3/4] overflow-hidden">
          <img
            src={artwork.image || "/placeholder.svg"}
            alt={artwork.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        </div>
        {!artwork.available && (
          <div className="absolute top-3 right-3 rounded-sm bg-destructive/90 px-2 py-1 text-xs font-medium text-destructive-foreground">
            Sold
          </div>
        )}
        {(onEdit || onDelete) && (
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-lg hover:scale-110 transition-transform"
                >
                  <MoreHorizontal className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(artwork.id); }}
                    className="cursor-pointer hover:bg-secondary focus:bg-secondary"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit Artwork</span>
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(artwork.id); }}
                    className="cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Artwork</span>
                  </DropdownMenuItem>
                )}
                {(onEdit || onDelete) && (
                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/submit?artist_id=${artwork.artistId}`); }}
                    className="cursor-pointer hover:bg-secondary focus:bg-secondary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Add more artworks</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <button
            onClick={handleFavorite}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-all hover:bg-background/90 hover:scale-110"
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                favorited ? "fill-destructive text-destructive" : "text-foreground"
              }`}
            />
          </button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 pointer-events-none">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">{artwork.artist}</p>
          <h3 className="font-display text-lg font-semibold text-foreground">{artwork.title}</h3>
          <p className="text-sm text-muted-foreground">${artwork.price.toLocaleString()}</p>
        </div>
      </Link>
      <div className="mt-3 transition-opacity duration-300">
        <Link to={`/artwork/${artwork.id}`} className="block">
          <h3 className="font-display text-base font-medium text-foreground hover:text-primary transition-colors">{artwork.title}</h3>
          <p className="text-sm text-muted-foreground hover:text-foreground transition-colors">{artwork.artist}</p>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-medium text-primary">${artwork.price.toLocaleString()}</p>
          <Button
            onClick={handlePlaceOrderClick}
            size="sm"
            disabled={!artwork.available || alreadyInCart}
            className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
          >
            {alreadyInCart ? "In Cart" : artwork.available ? "Place Order" : "Sold Out"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkCard;
