const {
  Users,
  Products,
  Machines,
  Orders,
  RentalBookings,
  Banners,
  Posters,
} = require('../config/db');

/**
 * Get overall dashboard overview statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const farmers = await Users.find({ role: 'FARMER' });
    const products = await Products.find();
    const machines = await Machines.find();
    const orders = await Orders.find();
    const rentals = await RentalBookings.find();

    const totalProductRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const totalRentalRevenue = rentals
      .filter((r) => r.status !== 'CANCELLED')
      .reduce((sum, r) => sum + (r.pricing?.totalAmount || 0), 0);

    return res.json({
      success: true,
      stats: {
        totalFarmers: farmers.length,
        totalProducts: products.length,
        totalMachines: machines.length,
        totalOrders: orders.length,
        totalRentals: rentals.length,
        activeOrders: orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length,
        activeRentals: rentals.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length,
        totalRevenue: totalProductRevenue + totalRentalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Farmer Management
 */
const getFarmers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let farmers = await Users.find({ role: 'FARMER' });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      farmers = farmers.filter(
        (f) =>
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.mobileNumber && f.mobileNumber.includes(q)) ||
          (f.village && f.village.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: farmers.length,
      farmers,
    });
  } catch (error) {
    next(error);
  }
};

const toggleBlockFarmer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await Users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }
    const updated = await Users.findByIdAndUpdate(id, {
      isBlocked: !user.isBlocked,
    });
    return res.json({
      success: true,
      message: `Farmer ${updated.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * All Orders Management
 */
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Orders.find();
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * All Rental Bookings Management
 */
const getAllRentals = async (req, res, next) => {
  try {
    const rentals = await RentalBookings.find();
    rentals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({
      success: true,
      rentals,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getFarmers,
  toggleBlockFarmer,
  getAllOrders,
  getAllRentals,
};
