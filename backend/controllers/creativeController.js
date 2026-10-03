const AICreativeService = require('../ai/creativeService');

/**
 * Generate 3 AI concept variations for banner, poster, product, machine, or category
 */
const generateCreatives = async (req, res, next) => {
  try {
    const {
      title,
      category,
      subject,
      location,
      style,
      type = 'banner',
      count = 3,
      targetEntityId,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Campaign title or product name is required',
      });
    }

    const generation = await AICreativeService.generateCampaignCreatives({
      title,
      category,
      subject,
      location,
      style,
      type,
      count: parseInt(count, 10) || 3,
      targetEntityId,
    });

    return res.status(201).json({
      success: true,
      message: 'AI creative variations generated successfully',
      generation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all creative generations
 */
const getGenerations = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const generations = await AICreativeService.listGenerations(filter);
    return res.json({
      success: true,
      count: generations.length,
      generations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single generation by ID
 */
const getGenerationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const generation = await AICreativeService.getGenerationById(id);
    if (!generation) {
      return res.status(404).json({
        success: false,
        message: 'Generation record not found',
      });
    }

    return res.json({
      success: true,
      generation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a variation
 */
const approveVariation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      variationId,
      title,
      subtitle,
      ctaText,
      badge,
      targetScreen,
      startDate,
      endDate,
      publishToLive = true,
    } = req.body;

    if (!variationId) {
      return res.status(400).json({
        success: false,
        message: 'variationId is required to approve',
      });
    }

    const result = await AICreativeService.approveVariation({
      generationId: id,
      variationId,
      title,
      subtitle,
      ctaText,
      badge,
      targetScreen,
      startDate,
      endDate,
      publishToLive,
    });

    return res.json({
      success: true,
      message: 'Variation approved and registered to asset bank successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Schedule a creative to production
 */
const scheduleCreative = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      variationId,
      title,
      subtitle,
      ctaText,
      badge,
      targetScreen,
      startDate,
      endDate,
    } = req.body;

    if (!variationId) {
      return res.status(400).json({
        success: false,
        message: 'variationId is required to schedule',
      });
    }

    const result = await AICreativeService.scheduleCreative({
      generationId: id,
      variationId,
      title,
      subtitle,
      ctaText,
      badge,
      targetScreen,
      startDate,
      endDate,
    });

    return res.json({
      success: true,
      message: 'Creative scheduled to live banner/poster queue successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all approved AI assets in library
 */
const getAIAssets = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const assets = await AICreativeService.listAIAssets(filter);
    return res.json({
      success: true,
      count: assets.length,
      assets,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCreatives,
  getGenerations,
  getGenerationById,
  approveVariation,
  scheduleCreative,
  getAIAssets,
};
