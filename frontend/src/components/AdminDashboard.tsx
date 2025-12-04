import { useEffect, useState } from 'react';
import { Users, Package, AlertTriangle, TrendingUp, Plus, Trash2, Check, X as XIcon } from 'lucide-react';
import type { Product } from '../data/mockData';
import { categories } from '../data/mockData';
import { fetchProducts, approveProduct, rejectProduct } from '../api/client';
import type { User } from '../App';

interface AdminDashboardProps {
  user: User | null;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'fraud'>('overview');
  const [newCategory, setNewCategory] = useState('');
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

  const pendingProducts = products.filter(p => p.status === 'pending');
  const totalProducts = products.length;
  const totalUsers = 156;

  const handleApprove = async (id: string) => {
    if (!user || user.role !== 'ADMIN') {
      alert('Accès réservé aux administrateurs');
      return;
    }

    try {
      const updated = await approveProduct(id, user.token);
      setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'approbation de l'article");
    }
  };

  const handleReject = async (id: string) => {
    if (!user || user.role !== 'ADMIN') {
      alert('Accès réservé aux administrateurs');
      return;
    }

    try {
      const updated = await rejectProduct(id, user.token);
      setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    } catch (e) {
      console.error(e);
      alert("Erreur lors du rejet de l'article");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Chargement des produits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Tableau de bord administrateur</h1>
        <p className="text-gray-600">Gérez votre plateforme Collector.shop</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Utilisateurs</p>
              <p className="text-gray-900">{totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Articles</p>
              <p className="text-gray-900">{totalProducts}</p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">En attente</p>
              <p className="text-gray-900">{pendingProducts.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Revenus (5%)</p>
              <p className="text-gray-900">2,450 €</p>
            </div>
            <TrendingUp className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Vue d'ensemble
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 border-b-2 transition-colors ${activeTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Validation articles ({pendingProducts.length})
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-4 border-b-2 transition-colors ${activeTab === 'categories' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Catégories
          </button>

          <button
            onClick={() => setActiveTab('fraud')}
            className={`pb-4 border-b-2 transition-colors ${activeTab === 'fraud' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Détection fraudes
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-gray-900 mb-4">Activité récente</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-gray-900">Nouvel article ajouté</p>
                  <p className="text-gray-600">Nike Air Jordan 1 par SneakerCollector</p>
                </div>
                <span className="text-gray-500">Il y a 5 min</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-gray-900">Vente réalisée</p>
                  <p className="text-gray-600">Poster Star Wars - 850 €</p>
                </div>
                <span className="text-gray-500">Il y a 1h</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-gray-900">Nouvel utilisateur</p>
                  <p className="text-gray-600">jean.dupont@email.com</p>
                </div>
                <span className="text-gray-500">Il y a 2h</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-gray-900 mb-4">Statistiques des ventes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 mb-1">Aujourd'hui</p>
                <p className="text-gray-900">12 ventes</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Cette semaine</p>
                <p className="text-gray-900">87 ventes</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Ce mois</p>
                <p className="text-gray-900">342 ventes</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Total</p>
                <p className="text-gray-900">2,156 ventes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <h2 className="text-gray-900 mb-6">Articles en attente de validation</h2>
          {pendingProducts.length > 0 ? (
            <div className="space-y-4">
              {pendingProducts.map(product => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-4">
                    <img src={product.image} alt={product.title} className="w-32 h-32 object-cover rounded-lg" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-gray-900 mb-1">{product.title}</h3>
                          <p className="text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex gap-4 text-gray-600">
                            <span>Prix: {product.price.toFixed(2)} €</span>
                            <span>Vendeur: {product.sellerName}</span>
                            <span>Catégorie: {product.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleApprove(product.id)}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="h-4 w-4" />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleReject(product.id)}
                          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XIcon className="h-4 w-4" />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Aucun article en attente</h3>
              <p className="text-gray-600">Tous les articles ont été validés</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-gray-900">Gestion des catégories</h2>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-gray-900 mb-4">Ajouter une catégorie</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Nom de la catégorie"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="h-5 w-5" />
                Ajouter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <span className="text-gray-900">{category.name}</span>
                <button className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fraud' && (
        <div>
          <h2 className="text-gray-900 mb-6">Système de détection des fraudes</h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-yellow-900 mb-2">Alertes automatiques</h3>
                <p className="text-yellow-700 mb-4">
                  Le système surveille automatiquement les changements de prix suspects, les vendeurs avec des notes faibles,
                  et les articles potentiellement frauduleux.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-gray-900 mb-1">Changement de prix suspect</h4>
                  <p className="text-gray-600 mb-2">L'article "Figurine rare" a vu son prix augmenter de 300% en 24h</p>
                  <span className="text-gray-500">Vendeur: SuspectSeller • Il y a 30 min</span>
                </div>
                <button className="text-indigo-600 hover:text-indigo-700">Examiner</button>
              </div>
            </div>

            <div className="bg-white border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-gray-900 mb-1">Vendeur avec note faible</h4>
                  <p className="text-gray-600 mb-2">
                    Le vendeur "NewSeller123" a reçu plusieurs avis négatifs récemment (note: 2.1/5)
                  </p>
                  <span className="text-gray-500">Il y a 2h</span>
                </div>
                <button className="text-indigo-600 hover:text-indigo-700">Examiner</button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
            <h3 className="text-gray-900 mb-4">Intégration API de détection</h3>
            <p className="text-gray-600 mb-4">
              Connectez un service externe de détection de fraude pour une protection renforcée.
            </p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Configurer l'intégration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}