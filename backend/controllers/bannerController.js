const { Banners } = require('../config/db');

// Fallback default agriculture banner if none active
const DEFAULT_BANNER = {
  id: 'ban_default',
  title: 'Kisan Seva Kendra',
  subtitle: 'Buy genuine farming products and rent farm machines at fair village rates.',
  badge: 'Direct to Farm',
  ctaText: 'Explore App',
  targetScreen: 'Shop',
  theme: 'crops',
  bgColor: '#1B5E20',
  textColor: '#FFFFFF',
  accentColor: '#81C784',
  image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1000&q=80',
  isActive: true,
};

/**
 * Get active promotional banners filtered by date and targeting
 */
const getActiveBanners = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let banners = await Banners.find();

    banners = banners.filter((b) => {
      if (!b.isActive) return false;
      if (b.startDate && b.startDate > today) return false;
      if (b.endDate && b.endDate < today) return false;
      return true;
    });

    if (banners.length === 0) {
      banners = [DEFAULT_BANNER];
    }

    return res.json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all banners
 */
const getAllBanners = async (req, res, next) => {
  try {
    const banners = await Banners.find();
    return res.json({
      success: true,
      banners,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create banner
 */
const createBanner = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      badge,
      ctaText,
      targetScreen,
      targetCategory,
      theme,
      bgColor,
      image,
      startDate,
      endDate,
    } = req.body;

    if (!title || !ctaText) {
      return res.status(400).json({
        success: false,
        message: 'Banner title and CTA text are required',
      });
    }

    const created = await Banners.create({
      title,
      subtitle: subtitle || 'Special agriculture offering for farmers',
      badge: badge || 'Special Offer',
      ctaText,
      targetScreen: targetScreen || 'Shop',
      targetCategory: targetCategory || null,
      theme: theme || 'crops',
      bgColor: bgColor || '#1B5E20',
      textColor: '#FFFFFF',
      accentColor: '#FFB300',
      image: image || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1000&q=80',
      startDate: startDate || '2026-01-01',
      endDate: endDate || '2026-12-31',
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      banner: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update banner
 */
const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Banners.findByIdAndUpdate(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    return res.json({
      success: true,
      message: 'Banner updated successfully',
      banner: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete banner
 */
const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Banners.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
