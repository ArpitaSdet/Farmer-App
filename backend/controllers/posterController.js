const { Posters } = require('../config/db');

const DEFAULT_POSTER = {
  id: 'post_default',
  title: 'FARM MACHINES AT YOUR DOORSTEP',
  subtitle: 'Harvesters, Rotavators & Sprayers delivered directly to your farm.',
  ctaText: 'RENT NOW',
  targetScreen: 'Rent',
  image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
  bgGradient: ['#2E7D32', '#1B5E20'],
  isActive: true,
};

/**
 * Get active promotional posters
 */
const getActivePosters = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let posters = await Posters.find();

    posters = posters.filter((p) => {
      if (!p.isActive) return false;
      if (p.startDate && p.startDate > today) return false;
      if (p.endDate && p.endDate < today) return false;
      return true;
    });

    if (posters.length === 0) {
      posters = [DEFAULT_POSTER];
    }

    return res.json({
      success: true,
      count: posters.length,
      posters,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all posters
 */
const getAllPosters = async (req, res, next) => {
  try {
    const posters = await Posters.find();
    return res.json({
      success: true,
      posters,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create poster
 */
const createPoster = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      ctaText,
      targetScreen,
      targetCategory,
      image,
      startDate,
      endDate,
    } = req.body;

    if (!title || !ctaText) {
      return res.status(400).json({
        success: false,
        message: 'Poster title and CTA button text are required',
      });
    }

    const created = await Posters.create({
      title,
      subtitle: subtitle || 'Special farm offer',
      ctaText,
      targetScreen: targetScreen || 'Shop',
      targetCategory: targetCategory || null,
      image: image || 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=800&q=80',
      bgGradient: ['#2E7D32', '#1B5E20'],
      startDate: startDate || '2026-01-01',
      endDate: endDate || '2026-12-31',
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Poster created successfully',
      poster: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update poster
 */
const updatePoster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Posters.findByIdAndUpdate(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Poster not found' });
    }
    return res.json({
      success: true,
      message: 'Poster updated successfully',
      poster: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete poster
 */
const deletePoster = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Posters.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: 'Poster deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivePosters,
  getAllPosters,
  createPoster,
  updatePoster,
  deletePoster,
};
