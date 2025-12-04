import { useState } from 'react';
import { X } from 'lucide-react';

interface SignUpModalProps {
  onClose: () => void;
  onRegister: (name: string, email: string, password: string, role: 'BUYER' | 'SELLER') => Promise<void> | void;
}

export function SignUpModal({ onClose, onRegister }: SignUpModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onRegister(name, email, password, role);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-gray-900">Créer un compte</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-gray-900 mb-1 text-sm">Nom</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-gray-900 mb-1 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-gray-900 mb-1 text-sm">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <span className="block text-gray-900 mb-1 text-sm">Type de compte</span>
            <div className="flex items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="role" value="BUYER" checked={role==='BUYER'} onChange={() => setRole('BUYER')} />
                Acheteur
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="role" value="SELLER" checked={role==='SELLER'} onChange={() => setRole('SELLER')} />
                Vendeur
              </label>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs mb-1">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm hover:bg-black transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer le compte'}
          </button>

          <p className="text-gray-500 text-xs mt-2">
            Vous pouvez vous inscrire en tant qu’acheteur ou vendeur. Les vendeurs peuvent publier des articles.
          </p>
        </form>
      </div>
    </div>
  );
}
