/**
 * Base AI Image Provider Interface
 */

class BaseAIProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Generate multiple concept variations
   * @param {Object} options
   * @param {string} options.prompt
   * @param {string} options.negativePrompt
   * @param {string} options.aspectRatio
   * @param {number} options.count - Number of variations (default: 3)
   * @param {string} options.type - 'product', 'machine', 'banner', 'poster', 'category'
   * @returns {Promise<Array<{ id: string, imageUrl: string, thumbnailUrl: string, prompt: string, seed: number }>>}
   */
  async generateVariations(options) {
    throw new Error('generateVariations() must be implemented by subclass');
  }
}

module.exports = BaseAIProvider;
