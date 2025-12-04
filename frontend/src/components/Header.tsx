import { useState } from 'react';
import { ShoppingBag, User as UserIcon, LogIn, LogOut, LayoutDashboard, Shield, Menu, X } from 'lucide-react';
import type { User, PageView } from '../App';

interface HeaderProps {
  user: User | null;
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
  onNavigate: (page: PageView) => void;
  currentPage: PageView;
  cartItemCount: number;
  onOpenCart: () => void;
  onAddProduct: () => void;
}

export function Header({
  user,
  onLogin,
  onSignup,
  onLogout,
  onNavigate,
  currentPage,
  cartItemCount,
  onOpenCart,
  onAddProduct
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (page: PageView) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleNavigate('home')}
          >
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-gray-900 text-base leading-tight">Collector.shop</span>
              <span className="block text-gray-500 text-xs leading-tight">Votre marketplace de collection</span>
            </div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-6">
          {user?.role !== 'ADMIN' && (
            <>
              <button
                onClick={() => handleNavigate('home')}
                className={`text-sm transition-colors ${currentPage === 'home' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Accueil
              </button>
              <button
                onClick={() => handleNavigate('catalog')}
                className={`text-sm transition-colors ${currentPage === 'catalog' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Catalogue
              </button>
            </>
          )}
          {user && user.role !== 'ADMIN' && (
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`flex items-center gap-1 text-sm transition-colors ${currentPage === 'dashboard' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Mon espace
            </button>
          )}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => handleNavigate('admin')}
              className={`flex items-center gap-1 text-sm transition-colors ${currentPage === 'admin' ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2">
{(!user || user.role === 'SELLER') && (
            <button
              onClick={onAddProduct}
              className="hidden md:inline-flex items-center px-3 py-2 rounded-full bg-gray-900 text-white text-xs hover:bg-black transition-colors"
            >
              Vendre un article
            </button>
          )}

          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ShoppingBag className="h-5 w-5 text-gray-700" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {cartItemCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-gray-500">Connecté en tant que</span>
                <span className="text-sm text-gray-900 font-medium flex items-center gap-2">
                  {user.name}
                  {user.role === 'SELLER' && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">Compte vendeur</span>
                  )}
                  {user.role === 'ADMIN' && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Admin</span>
                  )}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-700 hover:border-red-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onLogin}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-700 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Se connecter
              </button>
              <button
                onClick={onSignup}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 text-xs text-gray-700 hover:border-green-600 hover:text-green-600 transition-colors"
              >
                Créer un compte
              </button>
            </div>
          )}
        </div>
      </div>

          {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          {user?.role !== 'ADMIN' && (
            <>
              <button
                onClick={() => handleNavigate('home')}
                className="block w-full text-left py-2 text-gray-700"
              >
                Accueil
              </button>
              <button
                onClick={() => handleNavigate('catalog')}
                className="block w-full text-left py-2 text-gray-700"
              >
                Catalogue
              </button>
            </>
          )}
          {user && user.role !== 'ADMIN' && (
            <button
              onClick={() => handleNavigate('dashboard')}
              className="block w-full text-left py-2 text-gray-700"
            >
              Mon espace
            </button>
          )}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => handleNavigate('admin')}
              className="block w-full text-left py-2 text-gray-700"
            >
              Admin
            </button>
          )}
{(!user || user.role === 'SELLER') && (
            <button
              onClick={onAddProduct}
              className="block w-full text-left py-2 text-gray-700"
            >
              Vendre un article
            </button>
          )}
        </div>
      )}
    </header>
  );
}