import { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, AlertTriangle, TrendingUp, Plus, MessageCircle } from 'lucide-react';
import type { User } from '../App';
import type { Product } from '../data/mockData';
import { ProductCard } from './ProductCard';
import { fetchProducts } from '../api/client';

interface DashboardPageProps {
  user: User | null;
  onProductClick: (productId: string) => void;
  onOpenChat: () => void;
  onAddProduct: () => void;
  onUpgradeToSeller: () => void;
}

export function DashboardPage({
  user,
  onProductClick,
  onOpenChat,
  onAddProduct,
  onUpgradeToSeller,
}: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<'my-products' | 'favorites' | 'orders'>('my-products');
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

  const myProducts = user ? products.filter(p => p.sellerId === user.id) : [];
  const favoriteProducts = products.slice(0, 3);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Chargement des produits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2">
            Bonjour {user?.name || 'Collectionneur'}
          </h1>
          <p className="text-gray-600">
            Gérez vos articles, vos favoris et vos achats depuis cet espace.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onOpenChat}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-indigo-600 hover:text-indigo-600 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Contacter un acheteur
          </button>
{user?.role === 'SELLER' ? (
            <button
              onClick={onAddProduct}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Vendre un article
            </button>
          ) : user?.role === 'BUYER' ? (
            <button
              onClick={onUpgradeToSeller}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors"
            >
              Devenir vendeur
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Articles en vente</p>
              <p className="text-gray-900">{myProducts.length}</p>
            </div>
            <Package className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Articles favoris</p>
              <p className="text-gray-900">{favoriteProducts.length}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Ventes réalisées</p>
              <p className="text-gray-900">12</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Note moyenne</p>
              <p className="text-gray-900">4.8/5</p>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('my-products')}
            className={`pb-4 border-b-2 ${activeTab === 'my-products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Mes articles
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-4 border-b-2 ${activeTab === 'favorites' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Favoris
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 border-b-2 ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Mes achats
          </button>
        </nav>
      </div>

      {activeTab === 'my-products' && (
        <div>
          {myProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => onProductClick(product.id)}
                  showRecommendedBadge={false}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Vous n'avez pas encore d'article en vente</h3>
              <p className="text-gray-600 mb-4">
                Commencez à vendre vos pièces de collection en quelques clics.
              </p>
{user?.role === 'SELLER' ? (
                <button
                  onClick={onAddProduct}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Vendre un article
                </button>
              ) : user?.role === 'BUYER' ? (
                <button
                  onClick={onUpgradeToSeller}
                  className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-black transition-colors"
                >
                  Devenir vendeur
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div>
          {favoriteProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => onProductClick(product.id)}
                  showRecommendedBadge={true}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Aucun favori pour le moment</h3>
              <p className="text-gray-600">Ajoutez des articles à vos favoris pour les retrouver facilement.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-indigo-600" />
            <h3 className="text-gray-900">Historique des commandes</h3>
          </div>
          <p className="text-gray-600 mb-4">
            L'historique des commandes sera disponible une fois l'intégration avec le système de paiement réalisée.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700">
              Exemple de données à afficher :
            </p>
            <ul className="list-disc list-inside text-gray-600 mt-2">
              <li>Date de la commande</li>
              <li>Articles achetés</li>
              <li>Montant total</li>
              <li>Statut de livraison</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}