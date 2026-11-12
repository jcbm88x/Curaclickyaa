const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const Alert = require('./models/Alert');
const Category = require('./models/Category');
const Favorite = require('./models/Favorite');
const Notification = require('./models/Notification');
const PriceSnapshot = require('./models/PriceSnapshot');
const Product = require('./models/Product');
const Promotion = require('./models/Promotion');
const User = require('./models/User');
const { calculatePricing } = require('./utils/pricing');

const now = new Date();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function cop(amount) {
  return Math.round(amount * 100);
}

function fromNow({ days = 0, hours = 0 }) {
  return new Date(now.getTime() + days * DAY + hours * HOUR);
}

function statusFor(promotion) {
  if (!promotion.isActive) return 'paused';
  if (now < new Date(promotion.startAt)) return 'scheduled';
  if (now >= new Date(promotion.endAt)) return 'expired';
  return 'active';
}

async function seed() {
  if (env.isProduction && !process.argv.includes('--force')) {
    console.error('Seed bloqueado en produccion. Usa --force si es intencional.');
    process.exit(1);
  }

  await connectDB();
  console.log('[seed] limpiando colecciones...');

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Promotion.deleteMany({}),
    PriceSnapshot.deleteMany({}),
    Favorite.deleteMany({}),
    Alert.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const [adminHash, demoHash] = await Promise.all([
    bcrypt.hash(env.ADMIN_PASSWORD, 12),
    bcrypt.hash('Demo12345', 12),
  ]);

  const admin = await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL.toLowerCase(),
    passwordHash: adminHash,
    role: 'admin',
  });

  const demo = await User.create({
    name: 'Laura Restrepo',
    email: 'demo@curaclickya.com',
    passwordHash: demoHash,
    role: 'user',
  });

  const categoryData = [
    {
      name: 'Tecnologia',
      slug: 'tecnologia',
      icon: 'Cpu',
      description: 'Equipos y dispositivos de gama alta para trabajo y creacion.',
    },
    {
      name: 'Audio',
      slug: 'audio',
      icon: 'Headphones',
      description: 'Sonido de referencia para audifonos, parlantes y mas.',
    },
    {
      name: 'Hogar',
      slug: 'hogar',
      icon: 'Home',
      description: 'Objetos de diseno que elevan la experiencia cotidiana.',
    },
    {
      name: 'Belleza',
      slug: 'belleza',
      icon: 'Sparkles',
      description: 'Cuidado personal y fragancias seleccionadas.',
    },
    {
      name: 'Deportes',
      slug: 'deportes',
      icon: 'Dumbbell',
      description: 'Rendimiento, tecnologia y confort para entrenar.',
    },
  ];

  const categories = await Category.insertMany(categoryData);
  const categoryBySlug = new Map(categories.map((item) => [item.slug, item]));

  const productData = [
    {
      name: 'Sony WH-1000XM6',
      slug: 'sony-wh-1000xm6',
      brand: 'Sony',
      category: 'audio',
      price: 1899000,
      qualityTier: 'exclusive',
      rating: 4.9,
      reviewCount: 1840,
      description:
        'Audifonos de diadema con cancelacion de ruido adaptativa, audio de alta resolucion y hasta 40 horas de bateria. La referencia para viajar y trabajar sin distracciones.',
      specs: [
        { label: 'Cancelacion', value: 'Adaptativa de ultima generacion' },
        { label: 'Bateria', value: 'Hasta 40 horas' },
        { label: 'Conectividad', value: 'Bluetooth 5.4 multipunto' },
      ],
    },
    {
      name: 'MacBook Air 15" M4',
      slug: 'macbook-air-15-m4',
      brand: 'Apple',
      category: 'tecnologia',
      price: 6499000,
      qualityTier: 'exclusive',
      rating: 4.9,
      reviewCount: 2310,
      description:
        'Portatil ultradelgado con chip M4, pantalla Liquid Retina de 15 pulgadas y hasta 18 horas de autonomia. Potencia silenciosa para crear y trabajar.',
      specs: [
        { label: 'Chip', value: 'Apple M4 de 10 nucleos' },
        { label: 'Memoria', value: '16 GB unificados' },
        { label: 'Pantalla', value: 'Liquid Retina 15.3"' },
      ],
    },
    {
      name: 'iPad Pro 13" M4',
      slug: 'ipad-pro-13-m4',
      brand: 'Apple',
      category: 'tecnologia',
      price: 5749000,
      qualityTier: 'exclusive',
      rating: 4.8,
      reviewCount: 1560,
      description:
        'La tablet mas avanzada de Apple: pantalla Ultra Retina XDR OLED, chip M4 y un perfil increiblemente delgado para disenar, editar y producir.',
      specs: [
        { label: 'Pantalla', value: 'Ultra Retina XDR 13"' },
        { label: 'Chip', value: 'Apple M4' },
        { label: 'Almacenamiento', value: '256 GB' },
      ],
    },
    {
      name: 'Samsung OLED S95F 65"',
      slug: 'samsung-oled-s95f-65',
      brand: 'Samsung',
      category: 'tecnologia',
      price: 9999000,
      qualityTier: 'exclusive',
      rating: 4.8,
      reviewCount: 920,
      description:
        'Televisor OLED de 65 pulgadas con procesador NQ4 AI Gen3, 144 Hz y negros perfectos. Cine y gaming sin concesiones.',
      specs: [
        { label: 'Panel', value: 'OLED 65 pulgadas 4K' },
        { label: 'Refresco', value: '144 Hz' },
        { label: 'HDR', value: 'OLED HDR Pro' },
      ],
    },
    {
      name: 'Sony Alpha 7C II',
      slug: 'sony-alpha-7c-ii',
      brand: 'Sony',
      category: 'tecnologia',
      price: 8999000,
      qualityTier: 'exclusive',
      rating: 4.9,
      reviewCount: 640,
      description:
        'Camara mirrorless full frame compacta con sensor de 33 MP, enfoque automatico con IA y video 4K 60p. Calidad de estudio en un cuerpo de viaje.',
      specs: [
        { label: 'Sensor', value: 'Full frame 33 MP' },
        { label: 'Video', value: '4K 60p 10-bit' },
        { label: 'Estabilizacion', value: 'IBIS 7 pasos' },
      ],
    },
    {
      name: 'Marshall Emberton III',
      slug: 'marshall-emberton-iii',
      brand: 'Marshall',
      category: 'audio',
      price: 899000,
      qualityTier: 'premium',
      rating: 4.7,
      reviewCount: 1120,
      description:
        'Parlante portatil con sonido estereo de 360 grados, resistencia IP67 y 32 horas de bateria. Diseno iconico y potencia para llevar.',
      specs: [
        { label: 'Autonomia', value: '32 horas' },
        { label: 'Resistencia', value: 'IP67' },
        { label: 'Sonido', value: 'Stereo 360 grados' },
      ],
    },
    {
      name: 'Bose QuietComfort Ultra',
      slug: 'bose-quietcomfort-ultra',
      brand: 'Bose',
      category: 'audio',
      price: 1699000,
      qualityTier: 'premium',
      rating: 4.8,
      reviewCount: 1390,
      description:
        'Audifonos con audio espacial inmersivo y la cancelacion de ruido mas avanzada de Bose. Comodidad premium durante todo el dia.',
      specs: [
        { label: 'Audio', value: 'Bose Immersive Audio' },
        { label: 'Bateria', value: 'Hasta 24 horas' },
        { label: 'Microfonos', value: 'Sistema de 8 microfonos' },
      ],
    },
    {
      name: 'Dyson V15 Detect',
      slug: 'dyson-v15-detect',
      brand: 'Dyson',
      category: 'hogar',
      price: 3299000,
      qualityTier: 'exclusive',
      rating: 4.7,
      reviewCount: 780,
      description:
        'Aspiradora inalambrica con laser que revela el polvo invisible y sensor piezo que ajusta la potencia automaticamente. Limpieza profunda sin cables.',
      specs: [
        { label: 'Autonomia', value: 'Hasta 60 minutos' },
        { label: 'Potencia', value: '240 AW' },
        { label: 'Filtracion', value: 'HEPA completa' },
      ],
    },
    {
      name: 'Dyson Airwrap i.d.',
      slug: 'dyson-airwrap-id',
      brand: 'Dyson',
      category: 'belleza',
      price: 2899000,
      qualityTier: 'exclusive',
      rating: 4.6,
      reviewCount: 1050,
      description:
        'Multiestilizador que seca, alisa y riza usando el efecto Coanda, con perfiles personalizados desde la app. Estilo de salon sin calor extremo.',
      specs: [
        { label: 'Tecnologia', value: 'Coanda con control inteligente' },
        { label: 'Accesorios', value: '6 cabezales incluidos' },
        { label: 'Potencia', value: '1600 W' },
      ],
    },
    {
      name: 'Eureka Mignon Specialita',
      slug: 'eureka-mignon-specialita',
      brand: 'Eureka',
      category: 'hogar',
      price: 2450000,
      qualityTier: 'premium',
      rating: 4.8,
      reviewCount: 410,
      description:
        'Molino de cafe profesional con muelas planas de 55 mm y dosificacion micrometrica. Consistencia de barista en casa.',
      specs: [
        { label: 'Muelas', value: 'Planos 55 mm' },
        { label: 'Control', value: 'Dosificacion al decimo de segundo' },
        { label: 'Uso', value: 'Espresso y metodos' },
      ],
    },
    {
      name: 'Le Creuset Signature',
      slug: 'le-creuset-signature',
      brand: 'Le Creuset',
      category: 'hogar',
      price: 1299000,
      qualityTier: 'premium',
      rating: 4.9,
      reviewCount: 630,
      description:
        'Olla de hierro esmaltado de 5.5 cuartos con acabado premium y retencion de calor excepcional. Un clasico que dura generaciones.',
      specs: [
        { label: 'Material', value: 'Hierro fundido esmaltado' },
        { label: 'Capacidad', value: '5.5 cuartos' },
        { label: 'Compatibilidad', value: 'Todo tipo de estufas' },
      ],
    },
    {
      name: 'Chanel Bleu Parfum',
      slug: 'chanel-bleu-parfum',
      brand: 'Chanel',
      category: 'belleza',
      price: 780000,
      qualityTier: 'exclusive',
      rating: 4.8,
      reviewCount: 2100,
      description:
        'Fragancia amaderada aromatica con notas de cedro y sándalo. Elegancia contemporanea en una presentacion de 100 ml.',
      specs: [
        { label: 'Familia', value: 'Amaderada aromatica' },
        { label: 'Contenido', value: '100 ml' },
        { label: 'Concentracion', value: 'Parfum' },
      ],
    },
    {
      name: 'Nike Alphafly 3',
      slug: 'nike-alphafly-3',
      brand: 'Nike',
      category: 'deportes',
      price: 1299000,
      qualityTier: 'exclusive',
      rating: 4.7,
      reviewCount: 860,
      description:
        'Zapatilla de maraton con placas de carbono, espuma ZoomX y camara Air Zoom. Disenada para romper records personales.',
      specs: [
        { label: 'Placa', value: 'Carbono Flyplate' },
        { label: 'Amortiguacion', value: 'ZoomX + Air Zoom' },
        { label: 'Peso', value: '218 g aproximados' },
      ],
    },
    {
      name: 'Garmin Forerunner 965',
      slug: 'garmin-forerunner-965',
      brand: 'Garmin',
      category: 'deportes',
      price: 2699000,
      qualityTier: 'premium',
      rating: 4.8,
      reviewCount: 740,
      description:
        'Reloj GPS premium con pantalla AMOLED, mapas completos y metricas avanzadas de entrenamiento. Tu companero de alto rendimiento.',
      specs: [
        { label: 'Pantalla', value: 'AMOLED 1.4"' },
        { label: 'Bateria', value: 'Hasta 23 dias' },
        { label: 'GPS', value: 'Multibanda' },
      ],
    },
    {
      name: 'La Roche-Posay Hyalu B5',
      slug: 'la-roche-posay-hyalu-b5',
      brand: 'La Roche-Posay',
      category: 'belleza',
      price: 289000,
      qualityTier: 'select',
      rating: 4.7,
      reviewCount: 3200,
      description:
        'Serum con acido hialuronico puro y vitamina B5 para reparar y rellenar la piel. Hidratacion intensa con textura ligera.',
      specs: [
        { label: 'Activos', value: 'Acido hialuronico + B5' },
        { label: 'Contenido', value: '30 ml' },
        { label: 'Piel', value: 'Todo tipo de piel' },
      ],
    },
  ];

  const products = await Product.insertMany(
    productData.map((item) => ({
      name: item.name,
      slug: item.slug,
      brand: item.brand,
      description: item.description,
      category: categoryBySlug.get(item.category)._id,
      basePriceCents: cop(item.price),
      currency: 'COP',
      images: [
        `https://picsum.photos/seed/${item.slug}-1/900/900`,
        `https://picsum.photos/seed/${item.slug}-2/900/900`,
      ],
      qualityTier: item.qualityTier,
      specs: item.specs,
      rating: item.rating,
      reviewCount: item.reviewCount,
      isActive: true,
    })),
  );

  const productBySlug = new Map(products.map((product) => [product.slug, product]));

  const promotionData = [
    {
      product: 'sony-wh-1000xm6',
      type: 'percent',
      value: 32,
      label: 'Flagship con 32% de descuento',
      startAt: fromNow({ days: -2 }),
      endAt: fromNow({ days: 2, hours: 6 }),
      priority: 10,
    },
    {
      product: 'macbook-air-15-m4',
      type: 'percent',
      value: 18,
      label: 'Potencia M4 en oferta',
      startAt: fromNow({ days: -1 }),
      endAt: fromNow({ days: 5 }),
      priority: 8,
    },
    {
      product: 'ipad-pro-13-m4',
      type: 'fixed',
      value: cop(800000),
      label: 'Ahorra $800.000',
      startAt: fromNow({ days: -3 }),
      endAt: fromNow({ days: 3 }),
      priority: 9,
    },
    {
      product: 'dyson-v15-detect',
      type: 'percent',
      value: 28,
      label: 'Limpieza inteligente en oferta',
      startAt: fromNow({ days: -1 }),
      endAt: fromNow({ days: 1, hours: 4 }),
      priority: 7,
    },
    {
      product: 'dyson-airwrap-id',
      type: 'final',
      value: cop(1999000),
      label: 'Precio final de $1.999.000',
      startAt: fromNow({ days: -2 }),
      endAt: fromNow({ days: 2 }),
      priority: 6,
    },
    {
      product: 'nike-alphafly-3',
      type: 'percent',
      value: 25,
      label: 'Rendimiento sin excusas',
      startAt: fromNow({ days: -1 }),
      endAt: fromNow({ hours: 10 }),
      priority: 9,
    },
    {
      product: 'garmin-forerunner-965',
      type: 'final',
      value: cop(2199000),
      label: 'Tu mejor marca empieza aqui',
      startAt: fromNow({ days: -1 }),
      endAt: fromNow({ days: 4 }),
      priority: 6,
    },
    {
      product: 'chanel-bleu-parfum',
      type: 'percent',
      value: 20,
      label: 'Icono aromatico con 20% off',
      startAt: fromNow({ days: -2 }),
      endAt: fromNow({ days: 6 }),
      priority: 5,
    },
    {
      product: 'samsung-oled-s95f-65',
      type: 'fixed',
      value: cop(1500000),
      label: 'Cine en casa por menos',
      startAt: fromNow({ days: -2 }),
      endAt: fromNow({ days: 7 }),
      priority: 8,
    },
    {
      product: 'marshall-emberton-iii',
      type: 'percent',
      value: 30,
      label: 'Sonido iconico al 30% off',
      startAt: fromNow({ days: -1 }),
      endAt: fromNow({ hours: 12 }),
      priority: 7,
    },
    {
      product: 'le-creuset-signature',
      type: 'percent',
      value: 22,
      label: 'Un clasico para tu cocina',
      startAt: fromNow({ days: -1 }),
      endAt: fromNow({ days: 3 }),
      priority: 4,
    },
    {
      product: 'bose-quietcomfort-ultra',
      type: 'percent',
      value: 27,
      label: 'Silencio premium con 27% off',
      startAt: fromNow({ days: -1 }),
      endAt: fromNow({ days: 2 }),
      priority: 6,
    },
    {
      product: 'sony-alpha-7c-ii',
      type: 'percent',
      value: 15,
      label: 'Proxima oferta: full frame',
      startAt: fromNow({ days: 2 }),
      endAt: fromNow({ days: 6 }),
      priority: 5,
    },
    {
      product: 'eureka-mignon-specialita',
      type: 'percent',
      value: 18,
      label: 'Proxima oferta: cafe de barista',
      startAt: fromNow({ days: 1 }),
      endAt: fromNow({ days: 4 }),
      priority: 4,
    },
    {
      product: 'la-roche-posay-hyalu-b5',
      type: 'percent',
      value: 20,
      label: 'Oferta finalizada',
      startAt: fromNow({ days: -10 }),
      endAt: fromNow({ days: -3 }),
      priority: 3,
    },
  ];

  const promotions = await Promotion.insertMany(
    promotionData.map((item) => {
      const base = {
        ...item,
        product: productBySlug.get(item.product)._id,
        createdBy: admin._id,
        isActive: true,
      };
      return { ...base, status: statusFor(base) };
    }),
  );

  const promotionBySlug = new Map(
    promotionData.map((item, index) => [item.product, promotions[index]]),
  );

  const [favorites] = await Promise.all([
    Favorite.insertMany(
      ['sony-wh-1000xm6', 'ipad-pro-13-m4', 'nike-alphafly-3'].map((slug) => ({
        user: demo._id,
        product: productBySlug.get(slug)._id,
      })),
    ),
    Alert.insertMany([
      {
        user: demo._id,
        product: productBySlug.get('sony-wh-1000xm6')._id,
        minDiscount: 15,
      },
      {
        user: demo._id,
        category: categoryBySlug.get('audio')._id,
        minDiscount: 20,
      },
      {
        user: demo._id,
        category: categoryBySlug.get('hogar')._id,
        minDiscount: 25,
      },
    ]),
  ]);

  await Notification.insertMany([
    {
      user: demo._id,
      type: 'price_drop',
      title: 'Bajó el precio de Sony WH-1000XM6',
      message: 'Ahora tiene 32% de descuento. Tu alerta de 15% se cumplió.',
      product: productBySlug.get('sony-wh-1000xm6')._id,
      promotion: promotionBySlug.get('sony-wh-1000xm6')._id,
      meta: { discountPercent: 32 },
      readAt: null,
    },
    {
      user: demo._id,
      type: 'promotion_created',
      title: 'Nike Alphafly 3 entró en oferta',
      message: '25% de descuento por tiempo limitado.',
      product: productBySlug.get('nike-alphafly-3')._id,
      promotion: promotionBySlug.get('nike-alphafly-3')._id,
      meta: { discountPercent: 25 },
      readAt: null,
    },
    {
      user: demo._id,
      type: 'system',
      title: 'Bienvenida a Curaclickya',
      message: 'Guarda productos y crea alertas para no perder ninguna oferta.',
      readAt: new Date(now.getTime() - 2 * DAY),
    },
  ]);

  const snapshots = [];
  productData.forEach((item) => {
    const product = productBySlug.get(item.slug);
    const promotion = promotionBySlug.get(item.slug);
    const base = cop(item.price);
    const status = promotion ? statusFor(promotion) : null;

    snapshots.push(
      {
        product: product._id,
        promotion: null,
        finalPriceCents: base,
        discountPercent: 0,
        source: 'seed',
        capturedAt: fromNow({ days: -30 }),
      },
      {
        product: product._id,
        promotion: null,
        finalPriceCents: base,
        discountPercent: 0,
        source: 'seed',
        capturedAt: fromNow({ days: -15 }),
      },
    );

    if (promotion && status !== 'scheduled') {
      const pricing = calculatePricing(base, promotion);
      snapshots.push({
        product: product._id,
        promotion: promotion._id,
        finalPriceCents: pricing.finalPriceCents,
        discountPercent: pricing.discountPercent,
        source: 'seed',
        capturedAt: promotion.startAt,
      });

      if (status === 'expired') {
        snapshots.push({
          product: product._id,
          promotion: null,
          finalPriceCents: base,
          discountPercent: 0,
          source: 'seed',
          capturedAt: promotion.endAt,
        });
      }
    }

    const currentPricing = promotion
      ? calculatePricing(base, status === 'active' ? promotion : null)
      : calculatePricing(base, null);

    snapshots.push({
      product: product._id,
      promotion: null,
      finalPriceCents: currentPricing.finalPriceCents,
      discountPercent: currentPricing.discountPercent,
      source: 'seed',
      capturedAt: new Date(),
    });
  });

  await PriceSnapshot.insertMany(snapshots);

  const activeCount = promotions.filter((promotion) => statusFor(promotion) === 'active').length;

  console.log('');
  console.log('Seed completado.');
  console.log(`  Categorias: ${categories.length}`);
  console.log(`  Productos: ${products.length}`);
  console.log(`  Promociones activas: ${activeCount} de ${promotions.length}`);
  console.log(`  Favoritos demo: ${favorites.length}`);
  console.log(`  Puntos de historial: ${snapshots.length}`);
  console.log('');
  console.log('Credenciales:');
  console.log(`  Admin: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}`);
  console.log('  Usuario demo: demo@curaclickya.com / Demo12345');
  console.log('');
}

seed()
  .catch((error) => {
    console.error('[seed] error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
    await mongoose.connection.close().catch(() => {});
  });
