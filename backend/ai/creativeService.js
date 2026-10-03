const { PromptBuilder, CREATIVE_STYLES } = require('./promptBuilder');
const LocalAIProvider = require('./providers/localAIProvider');
const {
  CreativeGenerations,
  AIAssets,
  Banners,
  Posters,
  Products,
  Machines,
} = require('../config/db');

const localProvider = new LocalAIProvider();

class AICreativeService {
  /**
   * Generate campaign visuals (3 AI concept variations)
   */
  static async generateCampaignCreatives({
    title,
    category = 'General',
    subject,
    location = 'Hubballi',
    style = 'PREMIUM_PHOTOGRAPHY',
    type = 'banner',
    count = 3,
    targetEntityId = null,
  }) {
    let promptObj;

    if (type === 'product') {
      let product = null;
      if (targetEntityId) {
        product = await Products.findById(targetEntityId);
      }
      promptObj = PromptBuilder.buildProductImagePrompt(
        product || { name: title, categorySlug: category, packSize: 'standard' },
        style
      );
    } else if (type === 'machine') {
      let machine = null;
      if (targetEntityId) {
        machine = await Machines.findById(targetEntityId);
      }
      promptObj = PromptBuilder.buildMachineImagePrompt(
        machine || { name: title, brand: category, horsepower: '50 HP' },
        'front-quarter',
        style
      );
    } else if (type === 'poster') {
      promptObj = PromptBuilder.buildPosterPrompt({ title, subject }, style);
    } else if (type === 'category') {
      promptObj = PromptBuilder.buildCategoryPrompt({ name: title, subject }, style);
    } else {
      // Default: banner
      promptObj = PromptBuilder.buildBannerPrompt({ title, subject, location }, style);
    }

    const variations = await localProvider.generateVariations({
      prompt: promptObj.prompt,
      negativePrompt: promptObj.negativePrompt,
      aspectRatio: promptObj.aspectRatio,
      count,
      type,
    });

    const generationRecord = await CreativeGenerations.create({
      title,
      category,
      subject: subject || title,
      location,
      style,
      type,
      prompt: promptObj.prompt,
      negativePrompt: promptObj.negativePrompt,
      aspectRatio: promptObj.aspectRatio,
      variations,
      status: 'draft',
      selectedVariationId: null,
      targetEntityId,
    });

    return generationRecord;
  }

  /**
   * Approve a specific variation and optionally publish to active production banners/posters
   */
  static async approveVariation({
    generationId,
    variationId,
    title,
    subtitle,
    ctaText,
    badge,
    targetScreen = 'Shop',
    startDate,
    endDate,
    publishToLive = true,
  }) {
    const generation = await CreativeGenerations.findById(generationId);
    if (!generation) {
      throw new Error(`Creative generation record ${generationId} not found`);
    }

    const variation = generation.variations.find((v) => v.id === variationId);
    if (!variation) {
      throw new Error(`Variation ${variationId} not found in generation ${generationId}`);
    }

    // Save as approved AI asset
    const aiAsset = await AIAssets.create({
      generationId,
      variationId,
      type: generation.type,
      imageUrl: variation.imageUrl,
      thumbnailUrl: variation.thumbnailUrl,
      prompt: generation.prompt,
      style: generation.style,
      conceptTitle: variation.conceptTitle,
      aspectRatio: variation.aspectRatio,
      seed: variation.seed,
      status: 'approved',
      title: title || generation.title,
    });

    // Update generation state
    const updatedGen = await CreativeGenerations.findByIdAndUpdate(generationId, {
      selectedVariationId: variationId,
      status: 'approved',
      approvedAssetId: aiAsset.id,
    });

    let liveEntity = null;

    if (publishToLive) {
      const today = new Date().toISOString().split('T')[0];

      if (generation.type === 'banner') {
        liveEntity = await Banners.create({
          title: title || generation.title,
          subtitle: subtitle || 'Genuine farm products & machinery directly for farmers',
          badge: badge || 'AI Recommended',
          ctaText: ctaText || 'Explore Now',
          targetScreen: targetScreen || 'Shop',
          theme: 'crops',
          bgColor: '#1B5E20',
          textColor: '#FFFFFF',
          accentColor: '#FFB300',
          image: variation.imageUrl,
          startDate: startDate || today,
          endDate: endDate || '2026-12-31',
          isActive: true,
          aiAssetId: aiAsset.id,
        });
      } else if (generation.type === 'poster') {
        liveEntity = await Posters.create({
          title: title || generation.title,
          subtitle: subtitle || 'Boost field productivity with direct farm services',
          ctaText: ctaText || 'RENT NOW',
          targetScreen: targetScreen || 'Rent',
          image: variation.imageUrl,
          bgGradient: ['#2E7D32', '#1B5E20'],
          startDate: startDate || today,
          endDate: endDate || '2026-12-31',
          isActive: true,
          aiAssetId: aiAsset.id,
        });
      } else if (generation.type === 'product' && generation.targetEntityId) {
        const prod = await Products.findById(generation.targetEntityId);
        if (prod) {
          const images = [variation.imageUrl, ...(prod.images || [])];
          liveEntity = await Products.findByIdAndUpdate(generation.targetEntityId, {
            image: variation.imageUrl,
            images,
          });
        }
      } else if (generation.type === 'machine' && generation.targetEntityId) {
        const mach = await Machines.findById(generation.targetEntityId);
        if (mach) {
          const images = [variation.imageUrl, ...(mach.images || [])];
          liveEntity = await Machines.findByIdAndUpdate(generation.targetEntityId, {
            image: variation.imageUrl,
            images,
          });
        }
      }
    }

    return {
      success: true,
      generation: updatedGen,
      aiAsset,
      liveEntity,
    };
  }

  /**
   * Schedule approved creative
   */
  static async scheduleCreative({
    generationId,
    variationId,
    type,
    title,
    subtitle,
    ctaText,
    badge,
    targetScreen,
    startDate,
    endDate,
  }) {
    return this.approveVariation({
      generationId,
      variationId,
      title,
      subtitle,
      ctaText,
      badge,
      targetScreen,
      startDate,
      endDate,
      publishToLive: true,
    });
  }

  /**
   * List all generations
   */
  static async listGenerations(filter = {}) {
    const generations = await CreativeGenerations.find();
    if (Object.keys(filter).length === 0) return generations;

    return generations.filter((g) => {
      if (filter.type && g.type !== filter.type) return false;
      if (filter.status && g.status !== filter.status) return false;
      return true;
    });
  }

  /**
   * Get single generation by ID
   */
  static async getGenerationById(id) {
    return CreativeGenerations.findById(id);
  }

  /**
   * List all approved AI assets in library
   */
  static async listAIAssets(filter = {}) {
    const assets = await AIAssets.find();
    if (Object.keys(filter).length === 0) return assets;

    return assets.filter((a) => {
      if (filter.type && a.type !== filter.type) return false;
      if (filter.status && a.status !== filter.status) return false;
      return true;
    });
  }
}

module.exports = AICreativeService;
