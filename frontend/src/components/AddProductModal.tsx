import { useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';
import { categories } from '../data/mockData';
import { uploadImage } from '../api/client';

interface AddProductModalProps {
  onClose: () => void;
  onSubmit: (productData: ProductFormData) => void;
}

export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  shipping: number;
  category: string;
  images: string[];
}

export function AddProductModal({ onClose, onSubmit }: AddProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: 0,
    shipping: 0,
    category: '',
    images: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est obligatoire';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire';
    } else if (formData.description.length < 50) {
      newErrors.description = 'La description doit contenir au moins 50 caractères';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Le prix doit être supérieur à 0';
    }

    if (formData.shipping < 0) {
      newErrors.shipping = 'Les frais de port ne peuvent pas être négatifs';
    }

    if (!formData.category) {
      newErrors.category = 'Veuillez sélectionner une catégorie';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'Au moins une photo est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
      onClose();
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        uploadedUrls.push(url);
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
      if (errors.images) {
        setErrors(prev => ({ ...prev, images: '' }));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload des images");
    } finally {
      setUploading(false);
      // reset input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-gray-900">Publier un article</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-gray-900 mb-2">Photos de l'article *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
            />
            <div className="grid grid-cols-4 gap-4 mb-4">
              {formData.images.map((img, index) => (
                <div key={index} className="relative">
                  <img src={img} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {formData.images.length < 8 && (
                <button
                  type="button"
                  onClick={handleFileInputClick}
                  className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  disabled={uploading}
                >
                  <Upload className="h-6 w-6 text-gray-400 mb-1" />
                  <span className="text-gray-500">
                    {uploading ? 'Upload en cours...' : 'Ajouter'}
                  </span>
                </button>
              )}
            </div>
            {errors.images && <p className="text-red-600">{errors.images}</p>}
            <p className="text-gray-500">Ajoutez jusqu'à 8 photos de qualité de votre article</p>
          </div>

          <div>
            <label className="block text-gray-900 mb-2">Titre de l'article *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ex: Nike Air Jordan 1 Retro High OG 'Chicago'"
              maxLength={100}
            />
            {errors.title && <p className="text-red-600 mt-1">{errors.title}</p>}
            <p className="text-gray-500 mt-1">{formData.title.length}/100 caractères</p>
          </div>

          <div>
            <label className="block text-gray-900 mb-2">Description détaillée *</label>
            <textarea
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Décrivez votre article en détail : état, authenticité, histoire, défauts éventuels..."
              maxLength={1000}
            />
            {errors.description && <p className="text-red-600 mt-1">{errors.description}</p>}
            <p className="text-gray-500 mt-1">
              {formData.description.length}/1000 caractères (minimum 50)
            </p>
          </div>

          <div>
            <label className="block text-gray-900 mb-2">Catégorie *</label>
            <select
              value={formData.category}
              onChange={e => handleInputChange('category', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-600 mt-1">{errors.category}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-900 mb-2">Prix de vente *</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={e => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
              </div>
              {errors.price && <p className="text-red-600 mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-gray-900 mb-2">Frais de port</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.shipping || ''}
                  onChange={e => handleInputChange('shipping', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.shipping ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
              </div>
              {errors.shipping && <p className="text-red-600 mt-1">{errors.shipping}</p>}
            </div>
          </div>

          {formData.price > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-blue-900 mb-2">Récapitulatif</h4>
              <div className="space-y-1 text-blue-800">
                <div className="flex justify-between">
                  <span>Prix de vente</span>
                  <span>{formData.price.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Commission Collector (5%)</span>
                  <span>- {(formData.price * 0.05).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between border-t border-blue-300 pt-1 mt-1">
                  <span>Vous recevrez</span>
                  <span>{(formData.price * 0.95).toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-yellow-900 mb-2">Informations importantes</h4>
            <ul className="text-yellow-800 space-y-1">
              <li>• Votre article sera vérifié avant publication (24-48h)</li>
              <li>• Les paiements se font uniquement via la plateforme</li>
              <li>• Ne communiquez jamais vos coordonnées personnelles</li>
              <li>• Assurez-vous que votre article est authentique</li>
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Publier l'article
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}