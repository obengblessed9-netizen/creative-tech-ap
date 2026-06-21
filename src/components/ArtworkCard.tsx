import { Link } from "react-router-dom";
import { Heart, Pencil, Trash2 } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";

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
}

const ArtworkCard = ({ artwork, index = 0 }: ArtworkCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(artwork.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(artwork.id);
  };

  return (
    <Link
      to={`/artwork/${artwork.id}`}
      className="group block opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative overflow-hidden rounded-lg bg-card">
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
          {onEdit && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(artwork.id); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-all hover:bg-background/90 hover:scale-110"
              aria-label="Edit artwork"
            >
              <Pencil className="h-4 w-4 text-foreground" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(artwork.id); }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background/70 backdrop-blur-sm transition-all hover:bg-destructive hover:scale-110 group/delete"
              aria-label="Delete artwork"
            >
              <Trash2 className="h-4 w-4 text-foreground group-hover/delete:text-destructive-foreground" />
            </button>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">{artwork.artist}</p>
          <h3 className="font-display text-lg font-semibold text-foreground">{artwork.title}</h3>
          <p className="text-sm text-muted-foreground">${artwork.price.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-3 group-hover:opacity-0 transition-opacity duration-300">
        <h3 className="font-display text-base font-medium text-foreground">{artwork.title}</h3>
        <p className="text-sm text-muted-foreground">{artwork.artist}</p>
        <p className="mt-1 text-sm font-medium text-primary">${artwork.price.toLocaleString()}</p>
      </div>
    </Link>
  );
};

export default ArtworkCard;
