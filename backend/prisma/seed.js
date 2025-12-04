const { PrismaClient } = require('@prisma/client');
const { products } = require('../src/products');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function categoryNameFromId(id) {
  switch (id) {
    case 'sneakers':
      return 'Sneakers';
    case 'star-wars':
      return 'Star Wars';
    case 'vinyl':
      return 'Vinyles';
    case 'vintage-posters':
      return 'Posters Vintage';
    case 'action-figures':
      return 'Figurines';
    case 'vintage-cameras':
      return 'Appareils Photo';
    case 'comic-books':
      return 'BD & Comics';
    default:
      return id;
  }
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Seed categories
  const categoryIds = [...new Set(products.map((p) => p.category))];
  for (const id of categoryIds) {
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: categoryNameFromId(id),
      },
    });
  }

  // Seed users (sellers) based on products' sellerId/sellerName
  const sellerIds = [...new Set(products.map((p) => p.sellerId))];
  for (const sellerId of sellerIds) {
    const sample = products.find((p) => p.sellerId === sellerId);
    await prisma.user.upsert({
      where: { id: sellerId },
      update: {
        role: 'SELLER',
        password: passwordHash,
      },
      create: {
        id: sellerId,
        name: sample.sellerName,
        email: `${sellerId}@example.com`,
        role: 'SELLER',
        password: passwordHash,
      },
    });
  }

  // Demo buyer & admin users
  await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {
      role: 'BUYER',
      password: passwordHash,
    },
    create: {
      name: 'Demo Buyer',
      email: 'buyer@example.com',
      role: 'BUYER',
      password: passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {
      role: 'SELLER',
      password: passwordHash,
    },
    create: {
      name: 'Demo Seller',
      email: 'seller@example.com',
      role: 'SELLER',
      password: passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      role: 'ADMIN',
      password: passwordHash,
    },
    create: {
      name: 'Demo Admin',
      email: 'admin@example.com',
      role: 'ADMIN',
      password: passwordHash,
    },
  });

  // Seed products
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        shipping: p.shipping,
        image: p.image,
        images: [p.image],
        categoryId: p.category,
        sellerId: p.sellerId,
        sellerName: p.sellerName,
        sellerRating: p.sellerRating,
        sellerReviews: p.sellerReviews,
        location: p.location,
        status: p.status,
        createdAt: new Date(p.createdAt),
        priceHistory: p.priceHistory || undefined,
      },
    });
  }

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
