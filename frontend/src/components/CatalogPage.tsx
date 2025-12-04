import { useState, useEffect } from 'react';
import { Search, Filter, Star } from 'lucide-react';
import { ProductCard } from './ProductCard';
import type { Product } from '../data/mockData';
import { categories } from '../data/mockData';
import { fetchProducts } from '../api/client';

interface CatalogPageProps {
  onProductClick: (productId: string) => void;
  userInterests?: string[];
}

export function CatalogPage({ onProductClick, userInterests }: CatalogPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');
  const [showRecommended, setShowRecommended] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (e) {
        setError('Impossible de charger les produits');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInterests =
      !showRecommended || (userInterests && userInterests.some(interest => product.category === interest));

    return matchesCategory && matchesSearch && matchesInterests;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      default:
        return 0;
    }
  });

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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="recent">Plus récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full transition-colors ${selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-600'}`}
          >
            Toutes les catégories
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full transition-colors ${selectedCategory === category.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-600'}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {userInterests && userInterests.length > 0 && (
          <button
            onClick={() => setShowRecommended(!showRecommended)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showRecommended ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-white text-gray-700 border border-gray-300 hover:border-yellow-400'}`}
          >
            <Star className={`h-5 w-5 ${showRecommended ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            Recommandés pour vous
          </button>
        )}
      </div>

      <div className="mb-4">
        <p className="text-gray-600">
          {sortedProducts.length} article{sortedProducts.length > 1 ? 's' : ''} trouvé
          {sortedProducts.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => onProductClick(product.id)}
            showRecommendedBadge={showRecommended && userInterests?.some(interest => product.category === interest)}
          />
        ))}
      </div>

      {sortedProducts.length === 0 && (
        <div className="text-center py-16">
          <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">Aucun article trouvé</h3>
          <p className="text-gray-600">Essayez de modifier vos filtres ou votre recherche</p>
        </div>
      )}
    </div>
  );
}