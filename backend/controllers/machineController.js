const { Machines } = require('../config/db');

/**
 * Get farm machinery listing with agricultural filters
 */
const getMachines = async (req, res, next) => {
  try {
    const {
      type,
      search,
      district,
      operatorAvailable,
      maxDistance,
      minRate,
      maxRate,
      sort,
    } = req.query;

    let machines = await Machines.find();

    // Type filter
    if (type && type !== 'all') {
      machines = machines.filter(
        (m) => m.type && m.type.toLowerCase() === type.toLowerCase()
      );
    }

    // Search filter (name, brand, model, location)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      machines = machines.filter((m) => {
        const nameMatch = m.name && m.name.toLowerCase().includes(q);
        const brandMatch = m.brand && m.brand.toLowerCase().includes(q);
        const locMatch = m.location && m.location.toLowerCase().includes(q);
        const typeMatch = m.type && m.type.toLowerCase().includes(q);
        return nameMatch || brandMatch || locMatch || typeMatch;
      });
    }

    // Operator filter
    if (operatorAvailable === 'true') {
      machines = machines.filter((m) => m.operatorAvailable);
    }

    // District / Location filter
    if (district) {
      machines = machines.filter(
        (m) => m.district && m.district.toLowerCase() === district.toLowerCase()
      );
    }

    // Distance filter
    if (maxDistance) {
      machines = machines.filter((m) => (m.distanceKm || 5) <= Number(maxDistance));
    }

    // Rate filters
    if (minRate) {
      machines = machines.filter((m) => m.hourlyRate >= Number(minRate));
    }
    if (maxRate) {
      machines = machines.filter((m) => m.hourlyRate <= Number(maxRate));
    }

    // Sorting
    if (sort === 'distance') {
      machines.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    } else if (sort === 'rate_asc') {
      machines.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (sort === 'rate_desc') {
      machines.sort((a, b) => b.hourlyRate - a.hourlyRate);
    } else if (sort === 'rating') {
      machines.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return res.json({
      success: true,
      count: machines.length,
      machines,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get nearby machines for farmer's location
 */
const getNearbyMachines = async (req, res, next) => {
  try {
    const { district = 'Dharwad' } = req.query;
    let machines = await Machines.find();
    // Prioritize available machines sorted by distance
    machines = machines
      .filter((m) => m.isAvailable)
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
      .slice(0, 6);

    return res.json({
      success: true,
      machines,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get machine details by ID
 */
const getMachineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const machine = await Machines.findById(id);
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Farm machine not found',
      });
    }
    return res.json({
      success: true,
      machine,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add farm machine
 */
const createMachine = async (req, res, next) => {
  try {
    const {
      name,
      type,
      brand,
      model,
      horsepower,
      location,
      district,
      state,
      pincode,
      hourlyRate,
      dailyRate,
      securityDeposit,
      operatorAvailable,
      operatorRatePerHour,
      deliveryAvailable,
      deliveryRatePerKm,
      image,
      description,
      ownerName,
      ownerPhone,
    } = req.body;

    if (!name || !type || !hourlyRate) {
      return res.status(400).json({
        success: false,
        message: 'Machine name, type, and hourly rate are required',
      });
    }

    const created = await Machines.create({
      name,
      type,
      brand: brand || 'AgriPro',
      model: model || 'Standard',
      horsepower: horsepower || '45 HP',
      specs: req.body.specs || { liftingCapacity: '1500 kg', fuelTank: '45L' },
      ownerName: ownerName || req.user.name || 'Local Machinery Provider',
      ownerPhone: ownerPhone || req.user.mobileNumber || '+91 94481 00000',
      location: location || 'Hubballi Rural',
      district: district || 'Dharwad',
      state: state || 'Karnataka',
      pincode: pincode || '580031',
      distanceKm: 4.0,
      hourlyRate: Number(hourlyRate),
      dailyRate: Number(dailyRate) || Math.round(Number(hourlyRate) * 7.5),
      securityDeposit: Number(securityDeposit) || 1000,
      operatorAvailable: operatorAvailable !== undefined ? !!operatorAvailable : true,
      operatorRatePerHour: Number(operatorRatePerHour) || 150,
      deliveryAvailable: deliveryAvailable !== undefined ? !!deliveryAvailable : true,
      deliveryRatePerKm: Number(deliveryRatePerKm) || 25,
      rating: 4.8,
      reviewCount: 1,
      isAvailable: true,
      image: image || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
      description: description || 'High performance agriculture machinery ready for field work.',
      compatibleAttachments: ['Plough', 'Cultivator', 'Trolley'],
      featured: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Machine registered successfully',
      machine: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update machine details
 */
const updateMachine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Machines.findByIdAndUpdate(id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found',
      });
    }
    return res.json({
      success: true,
      message: 'Machine updated successfully',
      machine: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete machine
 */
const deleteMachine = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Machines.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: 'Machine removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMachines,
  getNearbyMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
};
