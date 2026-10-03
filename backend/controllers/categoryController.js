const { Categories } = require('../config/db');

const getCategories = async (req, res, next) => {
  try {
    const categories = await Categories.find();
    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Categories.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    return res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, slug, icon, image, popular } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Category name and slug are required' });
    }
    const created = await Categories.create({
      name,
      slug,
      icon: icon || '🌱',
      image: image || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
      popular: !!popular,
      itemCount: 0,
    });
    return res.status(201).json({ success: true, message: 'Category created', category: created });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Categories.findByIdAndUpdate(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    return res.json({ success: true, message: 'Category updated', category: updated });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Categories.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
