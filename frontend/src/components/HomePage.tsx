import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { ProductCard } from './ProductCard';
import type { Product } from '../data/mockData';
import { fetchProducts } from '../api/client';
import { getImageUrl } from '../lib/getImageUrl';

interface HomePageProps {
  onProductClick: (productId: string) => void;
  onNavigateToCatalog: () => void;
}

export function HomePage({ onProductClick, onNavigateToCatalog }: HomePageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (e) {
        setError("Impossible de charger les produits");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const featuredProducts = products.slice(0, 4);
  const recentProducts = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
          <p className="text-gray-600">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 text-white text-xs mb-4">
              <Sparkles className="h-3 w-3" />
              <span>Notre marketplace vérifie chaque pièce</span>
            </div>

            <h1 className="text-gray-900 mb-4">
              La place de marché des passionnés de{' '}
              <span className="text-indigo-600">objets de collection</span>
            </h1>

            <p className="text-gray-600 mb-6">
              Sneakers, vinyles, affiches vintage, figurines, appareils photo... Achetez et vendez vos pièces
              en toute confiance, avec un système de vérification et de messagerie sécurisé.
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-gray-700 text-sm">Paiements sécurisés</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-gray-700 text-sm">Vendeurs notés par la communauté</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={onNavigateToCatalog}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm hover:bg-black transition-colors"
              >
                Explorer les articles
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center gap-2 border border-gray-300 text-gray-800 px-4 py-2 rounded-full text-sm hover:border-indigo-600 hover:text-indigo-600 transition-colors">
                Comment ça marche ?
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {featuredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-gray-900 text-sm line-clamp-2 mb-1">{product.title}</p>
                  <p className="text-gray-700 text-sm mb-1">{product.price.toFixed(2)} €</p>
                  <p className="text-gray-500 text-xs mb-2">Vendu par {product.sellerName}</p>
                  <button
                    onClick={() => onProductClick(product.id)}
                    className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Voir le détail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <h2 className="text-gray-900 mb-4">Pièces récemment ajoutées</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => onProductClick(product.id)}
              showRecommendedBadge={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}