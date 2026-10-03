const { Banners, Posters, Products, Machines, Categories } = require('../config/db');

/**
 * Get personalized home screen feed
 * Supports crop-based personalization (e.g. ?crops=cotton,paddy)
 */
const getHomeFeed = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Active Banners
    let banners = await Banners.find();
    banners = banners.filter((b) => {
      if (!b.isActive) return false;
      if (b.startDate && b.startDate > today) return false;
      if (b.endDate && b.endDate < today) return false;
      return true;
    });

    // 2. Active Posters
    let posters = await Posters.find();
    posters = posters.filter((p) => {
      if (!p.isActive) return false;
      if (p.startDate && p.startDate > today) return false;
      if (p.endDate && p.endDate < today) return false;
      return true;
    });

    // 3. Categories
    const categories = await Categories.find();

    // 4. Products for crop-specific recommendations
    const allProducts = await Products.find();
    const userCrops = req.query.crops
      ? req.query.crops.toLowerCase().split(',')
      : ['cotton', 'paddy', 'chickpea'];

    const recommendedForCrops = allProducts.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.categorySlug || '').toLowerCase();
      return userCrops.some((crop) => name.includes(crop) || desc.includes(crop) || cat.includes(crop));
    });

    // Best sellers (high rating or marked bestseller)
    const bestSellers = allProducts
      .filter((p) => p.isBestseller || (p.rating && p.rating >= 4.7))
      .slice(0, 6);

    // 5. Seasonal Machinery
    const allMachines = await Machines.find();
    const seasonalMachines = allMachines
      .filter((m) => m.isAvailable !== false)
      .slice(0, 6);

    return res.json({
      success: true,
      feed: {
        banners: banners.slice(0, 5),
        posters: posters.slice(0, 4),
        categories: categories.slice(0, 8),
        recommendedForCrops: recommendedForCrops.length > 0 ? recommendedForCrops.slice(0, 6) : allProducts.slice(0, 6),
        bestSellers,
        seasonalMachines,
        meta: {
          personalizedForCrops: userCrops,
          deliveryCity: 'Hubballi-Dharwad',
          helpline: '1800-123-FARM (Toll Free)',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHomeFeed,
};
