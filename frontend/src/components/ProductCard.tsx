import { Star, MapPin } from 'lucide-react';
import type { Product } from '../data/mockData';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  showRecommendedBadge?: boolean;
}

export function ProductCard({ product, onClick, showRecommendedBadge }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        {product.status === 'pending' && (
          <span className="absolute top-3 left-3 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            En attente
          </span>
        )}

        {product.status === 'sold' && (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-xs px-2 py-1 rounded-full">
            Vendu
          </span>
        )}

        {showRecommendedBadge && (
          <span className="absolute top-3 right-3 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
            Recommandé
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-gray-900 text-sm line-clamp-2 mb-1">{product.title}</p>

        <div className="flex items-baseline gap-1 mb-1">
          <p className="text-gray-900">{product.price.toFixed(2)} €</p>
          {product.shipping > 0 && (
            <p className="text-gray-500 text-xs">+ {product.shipping.toFixed(2)} € de port</p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span>{product.sellerRating.toFixed(1)}</span>
            <span>({product.sellerReviews})</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{product.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}