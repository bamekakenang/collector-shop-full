import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import type { CartItem, User } from '../App';

interface CartDrawerProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  user: User | null;
  onLogin: () => void;
}

export function CartDrawer({
  cart,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  user,
  onLogin
}: CartDrawerProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingTotal = cart.reduce((sum, item) => sum + item.product.shipping, 0);
  const total = subtotal + shippingTotal;
  const commission = total * 0.05;

  const handleCheckout = () => {
    if (!user) {
      onLogin();
      return;
    }
    alert('Paiement à implémenter avec intégration bancaire sécurisée');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-30" onClick={onClose}></div>

      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-xl flex flex-col">
        <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            <h2>Mon Panier</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Votre panier est vide</h3>
              <p className="text-gray-600 mb-4">Ajoutez des articles pour commencer vos achats</p>
              <button
                onClick={onClose}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Continuer mes achats
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.product.id} className="bg-gray-50 rounded-lg p-4 flex gap-4">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-gray-900 mb-1 line-clamp-2">{item.product.title}</h4>
                    <p className="text-gray-600 mb-2">{item.product.price.toFixed(2)} €</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-gray-900 w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 text-gray-600 hover:text-gray-900 border border-gray-300 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={onClearCart}
                className="text-red-600 hover:text-red-700 w-full text-center py-2"
              >
                Vider le panier
              </button>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frais de port</span>
                <span>{shippingTotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Commission Collector (5%)</span>
                <span>{commission.toFixed(2)} €</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{total.toFixed(2)} €</span>
              </div>
            </div>

            {!user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-900">Connectez-vous pour finaliser votre achat</p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {user ? 'Procéder au paiement' : 'Se connecter pour payer'}
            </button>

            <p className="text-gray-500 text-center mt-3">Paiement 100% sécurisé</p>
          </div>
        )}
      </div>
    </div>
  );
}