import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Star,
  MessageCircle,
  AlertCircle,
  TrendingDown,
  ShoppingCart,
  X as CloseIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { User } from '../App';
import type { Product } from '../data/mockData';
import { fetchProductById, createCheckoutSession } from '../api/client';

interface ProductDetailPageProps {
  productId: string | null;
  user: User | null;
  onBack: () => void;
  onOpenChat: () => void;
  onAddToCart: (product: Product) => void;
}

export function ProductDetailPage({
  productId,
  user,
  onBack,
  onOpenChat,
  onAddToCart,
}: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Load product details
  useEffect(() => {
    if (!productId) {
      setError('Produit introuvable');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const data = await fetchProductById(productId);
        setProduct(data);
      } catch (e) {
        setError('Produit introuvable');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [productId]);

  // Keyboard controls for lightbox (must stay before any conditional return)
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (event.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => {
          // Safely compute gallery length based on current product
          const galleryLength = (() => {
            if (!product) return 1;
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              return product.images.length;
            }
            return 1;
          })();

          return prev === 0 ? galleryLength - 1 : prev - 1;
        });
      } else if (event.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => {
          const galleryLength = (() => {
            if (!product) return 1;
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              return product.images.length;
            }
            return 1;
          })();

          return prev === galleryLength - 1 ? 0 : prev + 1;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, product]);

  const handleBuyNow = async () => {
    if (!user) {
      alert('Veuillez vous connecter pour acheter cet article');
      return;
    }

    if (!user.token) {
      alert('Session invalide, veuillez vous reconnecter.');
      return;
    }

    if (!product) {
      alert('Produit introuvable');
      return;
    }

    try {
      const { url } = await createCheckoutSession(product.id, user.token, 1);
      window.location.href = url;
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Erreur lors de la redirection vers le paiement');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Chargement du produit...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Retour
        </button>
        <p className="text-red-600">{error || 'Produit non trouvé'}</p>
      </div>
    );
  }

  const galleryImages = (product.images && Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image];

  const mainImage = galleryImages[Math.min(selectedImageIndex, galleryImages.length - 1)];

  const handleOpenLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) =>
      prev === galleryImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Lightbox overlay */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
          <button
            type="button"
            onClick={handleCloseLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-200"
          >
            <CloseIcon className="h-6 w-6" />
          </button>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-4 text-white hover:text-gray-200 px-2 py-2"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-4 text-white hover:text-gray-200 px-2 py-2"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <img
            src={mainImage}
            alt={product.title}
            className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-xl"
          />

          {galleryImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
              {selectedImageIndex + 1} / {galleryImages.length}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Retour au catalogue
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div>
          <div className="bg-gray-100 rounded-lg overflow-hidden mb-4 cursor-zoom-in" onClick={() => handleOpenLightbox(selectedImageIndex)}>
            <img
              src={mainImage}
              alt={product.title}
              className="w-full h-96 object-cover"
            />
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-3 mb-4 overflow-x-auto">
              {galleryImages.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-20 w-20 rounded-md overflow-hidden border-2 ${
                    index === selectedImageIndex
                      ? 'border-indigo-600'
                      : 'border-transparent hover:border-indigo-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.title} ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {product.priceHistory && product.priceHistory.length > 1 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-green-900 mb-1">Baisse de prix !</h4>
                <p className="text-green-700">
                  Prix réduit de {product.priceHistory[0].price.toFixed(2)} € à{' '}
                  {product.price.toFixed(2)} €
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div>
          <h1 className="text-gray-900 mb-4">{product.title}</h1>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-900">
                {product.sellerRating.toFixed(1)}
              </span>
              <span className="text-gray-500">
                ({product.sellerReviews} avis)
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{product.location}</span>
            </div>
          </div>

          {product.status === 'pending' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-orange-900 mb-1">
                  Article en attente de validation
                </h4>
                <p className="text-orange-700">
                  Cet article est en cours de vérification par notre équipe
                  avant publication.
                </p>
              </div>
            </div>
          )}

          {product.status === 'sold' && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
              <h4 className="text-gray-900 mb-1">Article vendu</h4>
              <p className="text-gray-600">Cet article n'est plus disponible.</p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-gray-900">
                {product.price.toFixed(2)} €
              </span>
            </div>
            {product.shipping > 0 && (
              <p className="text-gray-600">
                + {product.shipping.toFixed(2)} € de frais de port
              </p>
            )}
            <p className="text-gray-500 text-sm mt-2">
              Commission Collector (5%) et TVA seront ajoutées au moment du
              paiement.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={handleBuyNow}
              disabled={product.status !== 'available'}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {product.status === 'available'
                ? 'Acheter maintenant'
                : 'Non disponible'}
            </button>
            {product.status === 'available' && (
              <button
                onClick={() => {
                  onAddToCart(product);
                  alert('Article ajouté au panier !');
                }}
                className="w-full bg:white text-indigo-600 border border-indigo-600 py-3 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                Ajouter au panier
              </button>
            )}
            {user && product.status === 'available' && (
              <button
                onClick={onOpenChat}
                className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Contacter le vendeur
              </button>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700 whitespace-pre-line">
              {product.description}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-gray-900 mb-3">Vendeur</h3>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600">
                  {product.sellerName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-gray-900">{product.sellerName}</p>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-gray-700">
                    {product.sellerRating.toFixed(1)}
                  </span>
                  <span className="text-gray-500">
                    ({product.sellerReviews} ventes)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h4 className="text-blue-900 mb-2">Protection Collector.shop</h4>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• Paiement 100% sécurisé</li>
              <li>• Vendeur vérifié</li>
              <li>• Article contrôlé avant mise en ligne</li>
              <li>• Service client disponible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
