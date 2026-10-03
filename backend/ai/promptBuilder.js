/**
 * AI Creative Prompt Builder for Indian Agricultural Commerce & Machinery Rental
 * Ensures strict creative consistency, cultural authenticity, and negative prompt filtering.
 */

const GLOBAL_BRAND_STYLE = {
  theme: 'Premium Indian Agriculture',
  visualLanguage: [
    'natural golden hour and soft morning daylight',
    'authentic Indian rural farm environment with lush green crops and fertile soil',
    'photorealistic commercial advertising photography style',
    'sharp product focus with natural depth of field',
    'clean negative space allocated for application UI typography overlay',
    'authentic Indian farmer context with dignified, natural appearance',
  ],
  negativePrompt: [
    'deformed hands',
    'extra fingers',
    'distorted machinery parts',
    'unrealistic tractor wheels',
    'floating objects',
    'fake-looking or cartoonish farmers',
    'random text',
    'watermarks',
    'brand logos not provided',
    'low resolution',
    'blurry',
    'distorted packaging',
    'artificial plastic-looking crops',
  ].join(', '),
};

const CREATIVE_STYLES = {
  PREMIUM_PHOTOGRAPHY: 'Ultra-realistic commercial agriculture advertising photography, crisp 85mm lens, high dynamic range, soft natural sunlight',
  RURAL_LIFESTYLE: 'Warm candid Indian farming lifestyle photography, authentic rural morning mist, golden agricultural glow, natural emotions',
  MODERN_AGRICULTURE: 'Modern agricultural technology context, precision farming, high-efficiency equipment, clean crisp composition',
  SEASONAL_HARVEST: 'Abundant harvest season photography, ripe golden crops, vibrant rural harvest landscape, celebratory agricultural atmosphere',
  MINIMAL_STUDIO: 'Clean commercial product studio photography with soft earth and botanical accents, pristine agricultural studio lighting',
  CINEMATIC_FARM: 'Cinematic wide-angle farm vista, dramatic natural skies, rich soil textures, commercial billboard aesthetic',
};

class PromptBuilder {
  /**
   * Build AI prompt for product packaging & commercial shots
   */
  static buildProductImagePrompt(product, styleName = 'PREMIUM_PHOTOGRAPHY') {
    const style = CREATIVE_STYLES[styleName] || CREATIVE_STYLES.PREMIUM_PHOTOGRAPHY;
    const prompt = `Commercial product photography of ${product.name}, packaging size ${product.packSize || 'standard pack'}, category ${product.categorySlug || 'agricultural input'}. The branded product container is cleanly placed on organic farm soil with fresh green crop seedlings nearby. ${style}. ${GLOBAL_BRAND_STYLE.visualLanguage.join(', ')}. Clean composition, no embedded text or letters on the packaging, no watermarks.`;

    return {
      prompt,
      negativePrompt: GLOBAL_BRAND_STYLE.negativePrompt,
      aspectRatio: '1:1',
      style: styleName,
    };
  }

  /**
   * Build AI prompt for agricultural machinery
   */
  static buildMachineImagePrompt(machine, angle = 'front-quarter', styleName = 'PREMIUM_PHOTOGRAPHY') {
    const style = CREATIVE_STYLES[styleName] || CREATIVE_STYLES.PREMIUM_PHOTOGRAPHY;
    const prompt = `Commercial machinery advertisement photography of a ${machine.brand || 'Indian'} ${machine.name} (${machine.horsepower || '45 HP'}), ${angle} view, operating in a fertile Indian crop field with black cotton soil. An Indian farmer in clean cotton shirt is steering. ${style}. ${GLOBAL_BRAND_STYLE.visualLanguage.join(', ')}. Realistic tires, authentic engine details, clean field background, negative space on top for UI banner text, no watermarks, no distorted mechanical parts.`;

    return {
      prompt,
      negativePrompt: GLOBAL_BRAND_STYLE.negativePrompt,
      aspectRatio: '16:9',
      style: styleName,
    };
  }

  /**
   * Build AI prompt for dynamic home banners
   */
  static buildBannerPrompt(campaign, styleName = 'CINEMATIC_FARM') {
    const style = CREATIVE_STYLES[styleName] || CREATIVE_STYLES.CINEMATIC_FARM;
    const prompt = `Wide panoramic hero advertisement banner for Indian agricultural campaign "${campaign.title}". Subject: ${campaign.subject || 'Indian farmer with modern tractor and lush green crops'}. Location: ${campaign.location || 'Hubballi rural farmlands'}. ${style}. Rich agricultural colors, natural morning golden hour sun flare, wide cinematic composition with ample clean negative space on the left side for UI text overlay. High production value consumer startup advertising, no text in image, no watermarks.`;

    return {
      prompt,
      negativePrompt: GLOBAL_BRAND_STYLE.negativePrompt,
      aspectRatio: '16:9',
      style: styleName,
    };
  }

  /**
   * Build AI prompt for promotional posters
   */
  static buildPosterPrompt(campaign, styleName = 'SEASONAL_HARVEST') {
    const style = CREATIVE_STYLES[styleName] || CREATIVE_STYLES.SEASONAL_HARVEST;
    const prompt = `High impact vertical agricultural campaign poster image for "${campaign.title}". Featuring ${campaign.subject || 'Indian farmer examining flourishing crop field with farm machinery in background'}. ${style}. High contrast, rich warm earth and crop greens, striking focal composition with clean upper and lower space for typography overlay, no text, no watermarks.`;

    return {
      prompt,
      negativePrompt: GLOBAL_BRAND_STYLE.negativePrompt,
      aspectRatio: '4:3',
      style: styleName,
    };
  }

  /**
   * Build AI prompt for Category Visuals
   */
  static buildCategoryPrompt(category, styleName = 'PREMIUM_PHOTOGRAPHY') {
    const style = CREATIVE_STYLES[styleName] || CREATIVE_STYLES.PREMIUM_PHOTOGRAPHY;
    const prompt = `Square agricultural icon category hero image for "${category.name}". Showcasing authentic ${category.subject || category.name} in modern Indian farming context. ${style}. Isolated, vibrant, clean studio and natural farm blend, no text, no logos.`;

    return {
      prompt,
      negativePrompt: GLOBAL_BRAND_STYLE.negativePrompt,
      aspectRatio: '1:1',
      style: styleName,
    };
  }
}

module.exports = {
  PromptBuilder,
  CREATIVE_STYLES,
  GLOBAL_BRAND_STYLE,
};
