const BaseAIProvider = require('./baseAIProvider');

/**
 * Curated high-fidelity AI Agricultural Asset Bank
 * Used by Local Development AI Provider when cloud keys are not configured.
 */
const CURATED_AI_VISUALS = {
  tractor: [
    {
      concept: 'Front-Quarter Commercial Shot',
      url: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=400&q=70',
    },
    {
      concept: 'Wide Field Ploughing Vista',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=70',
    },
    {
      concept: 'Farmer Operator Action View',
      url: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=400&q=70',
    },
  ],
  harvester: [
    {
      concept: 'Golden Paddy Harvest Scene',
      url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=70',
    },
    {
      concept: 'Rubber Crawler Close-up',
      url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=400&q=70',
    },
    {
      concept: 'Sunset Grain Discharge View',
      url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=70',
    },
  ],
  seeds: [
    {
      concept: 'Commercial Seed Packaging with Soil',
      url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=350&q=70',
    },
    {
      concept: 'Emerging Seedlings in Farm Bed',
      url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=350&q=70',
    },
    {
      concept: 'Farmer Holding Certified Hybrid Grains',
      url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=350&q=70',
    },
  ],
  fertilizers: [
    {
      concept: 'Cooperative Fertilizer Sacks in Warehouse',
      url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=350&q=70',
    },
    {
      concept: 'Slow-Release Granules on Fertile Soil',
      url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=350&q=70',
    },
    {
      concept: 'Farm Delivery Van Unloading Fertilizer Sacks',
      url: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=350&q=70',
    },
  ],
  sprayer: [
    {
      concept: '16L Battery Knapsack in Cotton Field',
      url: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=350&q=70',
    },
    {
      concept: 'Tractor Boom Sprayer in Operation',
      url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23a07?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23a07?auto=format&fit=crop&w=350&q=70',
    },
    {
      concept: 'Precision Nozzle Mist Dispersion',
      url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1000&q=80',
      thumb: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=350&q=70',
    },
  ],
  campaign: [
    {
      concept: 'Cinematic Indian Farm Golden Hour',
      url: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=400&q=70',
    },
    {
      concept: 'Vibrant Green Sowing Season Landscape',
      url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=70',
    },
    {
      concept: 'Farmer Examining Prosperous Crops',
      url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1200&q=85',
      thumb: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=70',
    },
  ],
};

class LocalAIProvider extends BaseAIProvider {
  constructor() {
    super('Local-AgriCreative-Engine-v1');
  }

  async generateVariations({ prompt, negativePrompt, aspectRatio = '16:9', count = 3, type = 'campaign' }) {
    // Detect visual category from prompt keywords
    const pLower = (prompt || '').toLowerCase();
    let poolKey = 'campaign';
    if (pLower.includes('tractor') || pLower.includes('plough')) poolKey = 'tractor';
    else if (pLower.includes('harvester') || pLower.includes('paddy')) poolKey = 'harvester';
    else if (pLower.includes('seed')) poolKey = 'seeds';
    else if (pLower.includes('fertilizer') || pLower.includes('urea') || pLower.includes('dap')) poolKey = 'fertilizers';
    else if (pLower.includes('spray') || pLower.includes('pipe') || pLower.includes('irrigation')) poolKey = 'sprayer';

    const pool = CURATED_AI_VISUALS[poolKey] || CURATED_AI_VISUALS.campaign;

    // Simulate AI generation processing delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const variations = [];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      const item = pool[i];
      const seed = Math.floor(100000 + Math.random() * 900000);
      const varId = `ai_var_${Date.now()}_${seed}`;

      variations.push({
        id: varId,
        variationIndex: i + 1,
        conceptTitle: item.concept,
        imageUrl: item.url,
        thumbnailUrl: item.thumb,
        aspectRatio,
        seed,
        prompt,
        negativePrompt,
        engine: this.name,
        createdAt: new Date().toISOString(),
      });
    }

    return variations;
  }
}

module.exports = LocalAIProvider;
