const products = [
  {
    id: '1',
    title: 'Nike Air Jordan 1 Retro High OG "Chicago" - Edition Limitée',
    description:
      "Paire authentique de Nike Air Jordan 1 dans le coloris iconique Chicago. État neuf, jamais portée, avec boîte d'origine et tous les accessoires. Taille 42 EU.",
    price: 450.0,
    shipping: 15.0,
    image:
      'https://images.unsplash.com/photo-1758665630748-08141996c144?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwc25lYWtlcnMlMjBjb2xsZWN0aW9ufGVufDF8fHx8MTc2NDc1ODI4N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'sneakers',
    sellerId: 's1',
    sellerName: 'SneakerCollector',
    sellerRating: 4.8,
    sellerReviews: 142,
    location: 'Paris',
    status: 'available',
    createdAt: '2024-12-01',
    priceHistory: [
      { price: 500.0, date: '2024-11-20' },
      { price: 450.0, date: '2024-12-01' },
    ],
  },
  {
    id: '2',
    title: 'Poster Star Wars Episode IV - Affiche originale française 1977',
    description:
      'Affiche cinéma originale française de Star Wars - Un Nouvel Espoir (1977). Format 120x160cm. Très bon état de conservation, quelques plis mineurs. Pièce de collection rare.',
    price: 850.0,
    shipping: 25.0,
    image:
      'https://images.unsplash.com/photo-1467490917559-f75a31cada49?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFyJTIwd2FycyUyMHBvc3RlcnxlbnwxfHx8fDE3NjQ3NTgyODd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'vintage-posters',
    sellerId: 's2',
    sellerName: 'VintageCinemaCollector',
    sellerRating: 4.9,
    sellerReviews: 87,
    location: 'Lyon',
    status: 'available',
    createdAt: '2024-11-28',
  },
  {
    id: '3',
    title:
      'Vinyle Pink Floyd - The Dark Side of the Moon - Pressage original 1973',
    description:
      "Vinyle original de 1973, pressage français. Pochette en excellent état avec tous les inserts (posters, autocollants). Disque VG+, quelques légères marques d'usage.",
    price: 180.0,
    shipping: 8.0,
    image:
      'https://images.unsplash.com/photo-1588532218970-c2cab983746a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwdmlueWwlMjByZWNvcmRzfGVufDF8fHx8MTc2NDY5OTc1Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'vinyl',
    sellerId: 's3',
    sellerName: 'VinylMaster',
    sellerRating: 4.7,
    sellerReviews: 203,
    location: 'Bordeaux',
    status: 'available',
    createdAt: '2024-12-02',
  },
  {
    id: '4',
    title: 'Figurine Kenner Star Wars - Boba Fett vintage 1979',
    description:
      "Figurine Boba Fett originale Kenner de 1979. Complète avec toutes ses armes et accessoires. Excellent état pour son âge, articulations fonctionnelles.",
    price: 320.0,
    shipping: 10.0,
    image:
      'https://images.unsplash.com/photo-1759006728134-1090c6eace93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRybyUyMHRveXMlMjBjb2xsZWN0aW9ufGVufDF8fHx8MTc2NDc1ODI4OHww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'action-figures',
    sellerId: 's1',
    sellerName: 'SneakerCollector',
    sellerRating: 4.8,
    sellerReviews: 142,
    location: 'Paris',
    status: 'available',
    createdAt: '2024-11-25',
  },
  {
    id: '5',
    title: 'Appareil Photo Leica M3 - Argentique vintage 1954',
    description:
      "Leica M3 chromé en excellent état de fonctionnement. Viseur clair, obturateur précis. Quelques marques d'usage normales pour l'âge. Livré avec étui en cuir d'origine.",
    price: 1200.0,
    shipping: 20.0,
    image:
      'https://images.unsplash.com/photo-1495121553079-4c61bcce1894?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwY2FtZXJhfGVufDF8fHx8MTc2NDY2OTk1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'vintage-cameras',
    sellerId: 's4',
    sellerName: 'PhotoVintage',
    sellerRating: 5.0,
    sellerReviews: 56,
    location: 'Marseille',
    status: 'available',
    createdAt: '2024-11-30',
  },
  {
    id: '6',
    title: 'Collection complète Amazing Spider-Man #1-100 (1963-1971)',
    description:
      "Collection exceptionnelle des 100 premiers numéros d'Amazing Spider-Man. États variables de VG à VF. Plusieurs clés incluses dont le #1, #14 (1ère Green Goblin), #50 (1er Kingpin).",
    price: 5800.0,
    shipping: 30.0,
    image:
      'https://images.unsplash.com/photo-1759863738666-7584248cdf7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21pYyUyMGJvb2tzJTIwY29sbGVjdGlvbnxlbnwxfHx8fDE3NjQ2Mzk4NDJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'comic-books',
    sellerId: 's5',
    sellerName: 'ComicBookKing',
    sellerRating: 4.9,
    sellerReviews: 178,
    location: 'Toulouse',
    status: 'available',
    createdAt: '2024-11-22',
  },
  {
    id: '7',
    title: 'Adidas Yeezy Boost 350 V2 "Zebra" - Neuf avec étiquettes',
    description:
      "Yeezy Boost 350 V2 dans le coloris Zebra très recherché. État neuf, jamais portées, avec boîte, étiquettes et facture d'achat. Taille 43 1/3.",
    price: 380.0,
    shipping: 12.0,
    image:
      'https://images.unsplash.com/photo-1758665630748-08141996c144?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwc25lYWtlcnMlMjBjb2xsZWN0aW9ufGVufDF8fHx8MTc2NDc1ODI4N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'sneakers',
    sellerId: 's6',
    sellerName: 'YeezyHunter',
    sellerRating: 4.6,
    sellerReviews: 94,
    location: 'Lille',
    status: 'pending',
    createdAt: '2024-12-03',
  },
  {
    id: '8',
    title: 'Figurine Hot Toys Star Wars - Dark Vador 1/6 MMS279',
    description:
      "Figurine Hot Toys Darth Vader à l'échelle 1/6. Détails exceptionnels, nombreux points d'articulation, effets lumineux LED. Boîte complète avec tous les accessoires.",
    price: 520.0,
    shipping: 18.0,
    image:
      'https://images.unsplash.com/photo-1759006728134-1090c6eace93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRybyUyMHRveXMlMjBjb2xsZWN0aW9ufGVufDF8fHx8MTc2NDc1ODI4OHww&ixlib=rb-4.1.0&q=80&w=1080',
    category: 'star-wars',
    sellerId: 's7',
    sellerName: 'HotToysCollector',
    sellerRating: 4.8,
    sellerReviews: 67,
    location: 'Nantes',
    status: 'available',
    createdAt: '2024-11-27',
  },
];

module.exports = { products };
