const { Products } = require('../config/db');

/**
 * Get products with rich agricultural filters & search
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      crop,
      brand,
      minPrice,
      maxPrice,
      rating,
      inStock,
      sort,
    } = req.query;

    let products = await Products.find();

    // Category filter
    if (category && category !== 'all') {
      products = products.filter(
        (p) =>
          p.categorySlug === category ||
          (p.category && p.category.toLowerCase() === category.toLowerCase())
      );
    }

    // Keyword search (name, brand, suitable crops, description)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter((p) => {
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        const brandMatch = p.brand && p.brand.toLowerCase().includes(q);
        const descMatch = p.description && p.description.toLowerCase().includes(q);
        const cropMatch =
          p.suitableCrops &&
          p.suitableCrops.some((c) => c.toLowerCase().includes(q));
        return nameMatch || brandMatch || descMatch || cropMatch;
      });
    }

    // Crop filter
    if (crop) {
      const cLower = crop.toLowerCase();
      products = products.filter(
        (p) =>
          p.suitableCrops &&
          p.suitableCrops.some((c) => c.toLowerCase().includes(cLower))
      );
    }

    // Brand filter
    if (brand) {
      products = products.filter(
        (p) => p.brand && p.brand.toLowerCase() === brand.toLowerCase()
      );
    }

    // Price range
    if (minPrice !== undefined) {
      products = products.filter((p) => Number(p.price) >= Number(minPrice));
    }
    if (maxPrice !== undefined) {
      products = products.filter((p) => Number(p.price) <= Number(maxPrice));
    }

    // Rating
    if (rating !== undefined) {
      products = products.filter((p) => Number(p.rating) >= Number(rating));
    }

    // In Stock
    if (inStock === 'true') {
      products = products.filter((p) => p.inStock && p.stock > 0);
    }

    // Sorting
    if (sort === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'popular') {
      products.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
};

const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Products.find();
    const featured = products.filter((p) => p.featured || p.rating >= 4.7).slice(0, 8);
    return res.json({
      success: true,
      products: featured,
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    return res.json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      categorySlug,
      brand,
      packSize,
      price,
      mrp,
      stock,
      image,
      description,
      suitableCrops,
      dosage,
      usageInstructions,
      featured,
    } = req.body;

    if (!name || !price || !categorySlug) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and price are required',
      });
    }

    const created = await Products.create({
      name,
      categorySlug,
      brand: brand || 'Farmer Brand',
      packSize: packSize || '1 Unit',
      price: Number(price),
      mrp: Number(mrp) || Math.round(Number(price) * 1.15),
      discountPercentage: mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
      stock: Number(stock) || 50,
      inStock: (Number(stock) || 50) > 0,
      rating: 4.8,
      reviewCount: 1,
      image: image || 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=600&q=80',
      description: description || 'High quality farming input for higher crop yields.',
      suitableCrops: suitableCrops || ['Vegetables', 'Field crops'],
      dosage: dosage || 'As per package guidelines',
      usageInstructions: usageInstructions || 'Follow recommended agricultural practices.',
      deliveryTime: '2-3 Days to farm',
      featured: !!featured,
    });

    return res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: created,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Products.findByIdAndUpdate(id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    return res.json({
      success: true,
      message: 'Product updated successfully',
      product: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Products.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: 'Product removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
