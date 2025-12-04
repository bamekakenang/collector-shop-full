const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function rewriteUrl(url, targetBase) {
  if (!url || typeof url !== 'string') return url;
  // If absolute and localhost:4003 -> switch to targetBase
  try {
    const u = new URL(url);
    const t = new URL(targetBase);
    if (u.hostname === 'localhost' && u.port === '4003') {
      u.protocol = t.protocol;
      u.host = t.host; // hostname:port
      return u.toString();
    }
    return url;
  } catch {
    // Not an absolute URL (relative like /uploads/xxx). Prefix with base
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${targetBase.replace(/\/$/, '')}${path}`;
  }
}

async function main() {
  const targetBase = process.env.FIX_TARGET_BASE || process.env.FRONTEND_URL?.replace(/:\d+$/, ':4004') || 'http://localhost:4004';

  const products = await prisma.product.findMany();
  let updated = 0;

  for (const p of products) {
    let changed = false;
    let image = p.image;
    let images = Array.isArray(p.images) ? [...p.images] : undefined;

    // Rewrite main image
    const newImage = rewriteUrl(image, targetBase);
    if (newImage !== image) {
      image = newImage; changed = true;
    }

    // Rewrite gallery images if present
    if (images) {
      const rewritten = images.map((s) => rewriteUrl(String(s), targetBase));
      // If any changed
      if (rewritten.some((s, i) => s !== images[i])) {
        images = rewritten; changed = true;
      }
    }

    if (changed) {
      await prisma.product.update({ where: { id: p.id }, data: { image, images } });
      updated++;
    }
  }

  console.log(`Fix complete. Updated ${updated} products.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
