import { useEffect, useState } from 'react';
import { Users, Package, AlertTriangle, TrendingUp, Plus, Trash2, Check, X as XIcon, Shield } from 'lucide-react';
import type { Product } from '../data/mockData';
import { categories } from '../data/mockData';
import { getImageUrl } from '../lib/getImageUrl';
import { fetchProducts, approveProduct, rejectProduct, deleteProductAdmin, listSellerRequests, approveSellerRequest, rejectSellerRequest, adminListUsers, adminSetUserRole } from '../api/client';
import type { User } from '../App';

interface AdminDashboardProps {
  user: User | null;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'users' | 'categories' | 'fraud' | 'seller-requests'>('overview');
  const [newCategory, setNewCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(true);
  const [sellerRequests, setSellerRequests] = useState<any[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFilter, setUsersFilter] = useState<'ALL' | 'BUYER' | 'SELLER' | 'ADMIN'>('ALL');
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
            onClick={() => {
              setActiveTab('users');
              if (!user?.token) return;
              setUsersLoading(true);
              adminListUsers(user.token)
                .then(setUsers)
                .catch(() => alert("Impossible de lister les utilisateurs"))
                .finally(() => setUsersLoading(false));
            }}
            className={`pb-4 border-b-2 transition-colors ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Utilisateurs
          </button>

          <button
            onClick={() => setActiveTab('fraud')}
            className={`pb-4 border-b-2 transition-colors ${activeTab === 'fraud' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
          >
            Détection fraudes
          </button>
        </nav>
      </div>

      <div className="mb-6">
        <button
          onClick={async () => {
            if (!user?.token) return;
            setReqLoading(true);
            try {
              const list = await listSellerRequests(user.token, 'pending');
              setSellerRequests(list);
              setActiveTab('seller-requests');
            } catch (e) {
              alert("Impossible de charger les demandes vendeur");
            } finally {
              setReqLoading(false);
            }
          }}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          Voir les demandes vendeur en attente
        </button>
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
          <h2 className="text-gray-900 mb-6">Tous les articles ({totalProducts})</h2>
          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map(product => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-4">
                    <img src={getImageUrl(product.image)} alt={product.title} className="w-32 h-32 object-cover rounded-lg" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-gray-900 mb-1">{product.title}</h3>
                          <p className="text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                          <div className="flex flex-wrap gap-4 text-gray-600">
                            <span>Prix: {product.price.toFixed(2)} €</span>
                            <span>Vendeur: {product.sellerName}</span>
                            <span>Catégorie: {product.category}</span>
                            <span>
                              Statut:
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                product.status === 'available' ? 'bg-green-100 text-green-700' :
                                product.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {product.status}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {product.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(product.id)}
                              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Check className="h-4 w-4" />
                              Approuver
                            </button>
                            <button
                              onClick={() => handleReject(product.id)}
                              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                            >
                              <XIcon className="h-4 w-4" />
                              Rejeter
                            </button>
                          </>
                        )}
                        <button
                          onClick={async () => {
                            if (!user || user.role !== 'ADMIN') {
                              alert('Accès réservé aux administrateurs');
                              return;
                            }
                            if (!confirm('Supprimer définitivement cet article ?')) return;
                            try {
                              await deleteProductAdmin(product.id, user.token);
                              setProducts(prev => prev.filter(p => p.id !== product.id));
                            } catch (e) {
                              console.error(e);
                              alert("Erreur lors de la suppression de l'article");
                            }
                          }}
                          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
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
              <h3 className="text-gray-900 mb-2">Aucun article</h3>
              <p className="text-gray-600">La liste des articles est vide</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Gestion des utilisateurs</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Filtrer:</label>
              <select
                value={usersFilter}
                onChange={async (e) => {
                  const v = e.target.value as any;
                  setUsersFilter(v);
                  if (!user?.token) return;
                  setUsersLoading(true);
                  try {
                    const list = await adminListUsers(user.token, v === 'ALL' ? undefined : v);
                    setUsers(list);
                  } catch (e) {
                    alert("Impossible de lister les utilisateurs");
                  } finally {
                    setUsersLoading(false);
                  }
                }}
                className="px-2 py-1 border border-gray-300 rounded"
              >
                <option value="ALL">Tous</option>
                <option value="BUYER">Acheteurs</option>
                <option value="SELLER">Vendeurs</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <p className="text-gray-600">Chargement...</p>
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-gray-900">{u.name}</p>
                      <p className="text-gray-600 text-sm">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-700">{u.role}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!user?.token) return;
                          try {
                            const updated = await adminSetUserRole(user.token, u.id, 'BUYER');
                            setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
                          } catch {
                            alert("Maj du rôle impossible");
                          }
                        }}
                        className="px-3 py-1 text-xs rounded bg-white border border-gray-300 hover:bg-gray-50"
                      >Acheteur</button>
                      <button
                        onClick={async () => {
                          if (!user?.token) return;
                          try {
                            const updated = await adminSetUserRole(user.token, u.id, 'SELLER');
                            setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
                          } catch {
                            alert("Maj du rôle impossible");
                          }
                        }}
                        className="px-3 py-1 text-xs rounded bg-white border border-gray-300 hover:bg-gray-50"
                      >Vendeur</button>
                      <button
                        onClick={async () => {
                          if (!user?.token) return;
                          try {
                            const updated = await adminSetUserRole(user.token, u.id, 'ADMIN');
                            setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
                          } catch {
                            alert("Maj du rôle impossible");
                          }
                        }}
                        className="px-3 py-1 text-xs rounded bg-white border border-gray-300 hover:bg-gray-50"
                      >Admin</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aucun utilisateur</p>
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

      {activeTab === 'seller-requests' && (
        <div>
          <h2 className="text-gray-900 mb-6">Demandes vendeur en attente</h2>
          {reqLoading ? (
            <p className="text-gray-600">Chargement...</p>
          ) : sellerRequests.length > 0 ? (
            <div className="space-y-3">
              {sellerRequests.map((r) => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-gray-900">{r.user?.name || r.user?.email}</p>
                    <p className="text-gray-600 text-sm">{r.user?.email}</p>
                    <p className="text-gray-500 text-xs">Demande du {new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!user?.token) return;
                        try {
                          await approveSellerRequest(user.token!, r.id);
                          setSellerRequests((prev) => prev.filter((x) => x.id !== r.id));
                        } catch (e) {
                          alert("Erreur lors de l'approbation");
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={async () => {
                        if (!user?.token) return;
                        try {
                          await rejectSellerRequest(user.token!, r.id);
                          setSellerRequests((prev) => prev.filter((x) => x.id !== r.id));
                        } catch (e) {
                          alert('Erreur lors du rejet');
                        }
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aucune demande en attente</p>
          )}
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