function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function promotionAmount(basePriceCents, promotion) {
  if (!promotion) return 0;

  if (promotion.type === 'percent') {
    return Math.round((basePriceCents * clamp(promotion.value, 0, 100)) / 100);
  }

  if (promotion.type === 'fixed') {
    return clamp(Math.round(promotion.value), 0, basePriceCents);
  }

  if (promotion.type === 'final') {
    const finalPrice = clamp(Math.round(promotion.value), 0, basePriceCents);
    return basePriceCents - finalPrice;
  }

  return 0;
}

function calculatePricing(basePriceCents, promotion = null) {
  const base = Math.max(0, Math.round(basePriceCents || 0));
  const discountCents = promotionAmount(base, promotion);
  const finalPriceCents = Math.max(0, base - discountCents);
  const discountPercent =
    base > 0 && discountCents > 0 ? Math.round((discountCents / base) * 100) : 0;

  return {
    basePriceCents: base,
    finalPriceCents,
    discountCents,
    discountPercent,
    promotion: promotion
      ? {
          id: promotion._id ? promotion._id.toString() : undefined,
          type: promotion.type,
          value: promotion.value,
          label: promotion.label || null,
          priority: promotion.priority || 0,
          startAt: promotion.startAt,
          endAt: promotion.endAt,
        }
      : null,
  };
}

function isPromotionActive(promotion, now = new Date()) {
  if (!promotion || promotion.isActive === false) return false;
  const start = new Date(promotion.startAt);
  const end = new Date(promotion.endAt);
  return start <= now && now < end;
}

function pickBestPromotion(basePriceCents, promotions = [], now = new Date()) {
  const candidates = promotions
    .filter((promotion) => isPromotionActive(promotion, now))
    .map((promotion) => ({
      promotion,
      pricing: calculatePricing(basePriceCents, promotion),
    }))
    .filter((entry) => entry.pricing.discountCents > 0);

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (a.pricing.finalPriceCents !== b.pricing.finalPriceCents) {
      return a.pricing.finalPriceCents - b.pricing.finalPriceCents;
    }
    return (b.promotion.priority || 0) - (a.promotion.priority || 0);
  });

  return candidates[0];
}

module.exports = {
  calculatePricing,
  clamp,
  isPromotionActive,
  pickBestPromotion,
};
