import { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { CatalogPage } from './components/CatalogPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { DashboardPage } from './components/DashboardPage';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { SignUpModal } from './components/SignUpModal';
import { ChatWidget } from './components/ChatWidget';
import { CartDrawer } from './components/CartDrawer';
import { AddProductModal, ProductFormData } from './components/AddProductModal';
import { Product } from './data/mockData';
import { createProduct, loginUser, registerUser } from './api/client';

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  interests: string[];
  token?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PageView = 'home' | 'catalog' | 'product' | 'dashboard' | 'admin';

function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    const { user: apiUser, token } = await loginUser({ email, password });
    setUser({
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      role: apiUser.role as UserRole,
      interests: ['sneakers', 'star-wars', 'vintage-posters'],
      token,
    });
    setShowLoginModal(false);
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const { user: apiUser, token } = await registerUser({ name, email, password });
    setUser({
      id: apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      role: apiUser.role as UserRole,
      interests: ['sneakers', 'star-wars', 'vintage-posters'],
      token,
    });
    setShowSignUpModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('home');
  };

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentPage('product');
  };

  const handleAddToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleAddProduct = (productData: ProductFormData) => {
    if (!user) {
      alert('Vous devez être connecté pour publier un article');
      return;
    }

    if (user.role === 'BUYER') {
      alert('Seuls les vendeurs ou admins peuvent publier un article');
      return;
    }

    createProduct(
      {
        ...productData,
        sellerId: user.id,
        sellerName: user.name,
        location: 'France',
      },
      user.token,
    )
      .then(() => {
        alert('Votre article a été soumis pour validation. Vous serez notifié dans 24-48h.');
      })
      .catch((err) => {
        console.error(err);
        alert("Erreur lors de la création de l'article");
      });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onProductClick={handleProductClick}
            onNavigateToCatalog={() => setCurrentPage('catalog')}
          />
        );
      case 'catalog':
        return (
          <CatalogPage
            onProductClick={handleProductClick}
            userInterests={user?.interests}
          />
        );
      case 'product':
        return (
          <ProductDetailPage
            productId={selectedProductId}
            user={user}
            onBack={() => setCurrentPage('catalog')}
            onOpenChat={() => setShowChat(true)}
            onAddToCart={handleAddToCart}
          />
        );
      case 'dashboard':
        return (
          <DashboardPage
            user={user}
            onProductClick={handleProductClick}
            onOpenChat={() => setShowChat(true)}
            onAddProduct={() => setShowAddProduct(true)}
          />
        );
      case 'admin':
        return <AdminDashboard user={user} />;
      default:
        return (
          <HomePage
            onProductClick={handleProductClick}
            onNavigateToCatalog={() => setCurrentPage('catalog')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        onLogin={() => setShowLoginModal(true)}
        onSignup={() => setShowSignUpModal(true)}
        onLogout={handleLogout}
        onNavigate={(page) => setCurrentPage(page)}
        currentPage={currentPage}
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setShowCart(true)}
        onAddProduct={() => {
          if (!user) {
            setShowLoginModal(true);
          } else {
            setShowAddProduct(true);
          }
        }}
      />

      <main>{renderPage()}</main>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleLogin} />
      )}

      {showSignUpModal && (
        <SignUpModal onClose={() => setShowSignUpModal(false)} onRegister={handleRegister} />
      )}

      {showChat && user && (
        <ChatWidget user={user} onClose={() => setShowChat(false)} />
      )}

      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          user={user}
          onLogin={() => {
            setShowCart(false);
            setShowLoginModal(true);
          }}
        />
      )}

      {showAddProduct && (
        <AddProductModal
          onClose={() => setShowAddProduct(false)}
          onSubmit={handleAddProduct}
        />
      )}
    </div>
  );
}

export default App;