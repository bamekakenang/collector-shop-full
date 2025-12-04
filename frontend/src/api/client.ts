import type { Product } from '../data/mockData';
import type { ProductFormData } from '../components/AddProductModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN' | string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function loginUser(params: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Erreur de connexion');
  }

  return res.json();
}

export async function registerUser(params: { name?: string; email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Erreur lors de l'inscription");
  }

  return res.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products`);
  if (!res.ok) {
    throw new Error('Erreur lors du chargement des produits');
  }
  const data = await res.json();
  return (data as any[]).map((p) => ({
    ...p,
    category: p.category ?? p.categoryId,
    createdAt:
      typeof p.createdAt === 'string'
        ? p.createdAt
        : new Date(p.createdAt).toISOString(),
  }));
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`);
  if (!res.ok) {
    throw new Error('Produit non trouvé');
  }
  const p = await res.json();
  return {
    ...p,
    category: p.category ?? p.categoryId,
    createdAt:
      typeof p.createdAt === 'string'
        ? p.createdAt
        : new Date(p.createdAt).toISOString(),
  } as Product;
}

export interface CreateProductPayload extends ProductFormData {
  sellerId: string;
  sellerName: string;
  location?: string;
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Erreur lors de l'upload de l'image");
  }

  const data = await res.json();
  return data.url as string;
}

export async function createProduct(payload: CreateProductPayload, token?: string): Promise<Product> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Erreur lors de la création de l'article");
  }

  return res.json();
}

export async function createCheckoutSession(productId: string, token: string, quantity: number = 1): Promise<{ url: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${API_URL}/api/checkout/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId, quantity }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Erreur lors de la création de la session de paiement');
  }

  return res.json();
}

export async function approveProduct(id: string, token?: string): Promise<Product> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/admin/products/${id}/approve`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    throw new Error("Erreur lors de l'approbation de l'article");
  }

  return res.json();
}

export async function rejectProduct(id: string, token?: string): Promise<Product> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/admin/products/${id}/reject`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    throw new Error("Erreur lors du rejet de l'article");
  }

  return res.json();
}
