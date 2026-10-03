const { RentalBookings, Machines, Notifications } = require('../config/db');
const paymentService = require('../config/payments');

const TRACKING_STAGES_TEMPLATE = [
  { stage: 'Booking Accepted', done: true, time: 'Just now' },
  { stage: 'Machine Preparing', done: false, time: 'Upcoming' },
  { stage: 'Machine Dispatched', done: false, time: 'Upcoming' },
  { stage: 'Machine Near You', done: false, time: 'Upcoming' },
  { stage: 'Machine Delivered to Farm', done: false, time: 'Upcoming' },
  { stage: 'Rental Work Started', done: false, time: 'Upcoming' },
  { stage: 'Rental Completed', done: false, time: 'Upcoming' },
];

/**
 * Calculate transparent rental price
 */
const calculateRentalFare = (machine, { durationHours = 4, durationDays = 0, withOperator = true, withDelivery = true }) => {
  let baseRental = 0;
  if (durationDays > 0) {
    baseRental = durationDays * machine.dailyRate;
  } else {
    baseRental = Math.max(1, Number(durationHours)) * machine.hourlyRate;
  }

  const hours = durationDays > 0 ? durationDays * 8 : Number(durationHours);
  const operatorFee = withOperator && machine.operatorAvailable ? hours * (machine.operatorRatePerHour || 150) : 0;
  const deliveryFee = withDelivery && machine.deliveryAvailable ? Math.round((machine.distanceKm || 5) * (machine.deliveryRatePerKm || 25)) : 0;
  const securityDeposit = machine.securityDeposit || 1000;
  const totalAmount = baseRental + operatorFee + deliveryFee + securityDeposit;

  return {
    baseRental,
    operatorFee,
    deliveryFee,
    securityDeposit,
    totalAmount,
  };
};

/**
 * Create Rental Booking
 */
const createRentalBooking = async (req, res, next) => {
  try {
    const {
      machineId,
      startDate,
      startTime,
      durationHours = 4,
      durationDays = 0,
      withOperator = true,
      withDelivery = true,
      deliveryAddress,
      paymentMethod = 'CASH_AFTER_WORK',
    } = req.body;

    const machine = await Machines.findById(machineId);
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Selected farm machine was not found',
      });
    }

    const pricing = calculateRentalFare(machine, {
      durationHours,
      durationDays,
      withOperator,
      withDelivery,
    });

    const bookingId = `RNT-${Math.floor(1000 + Math.random() * 9000)}`;
    const userId = req.user.id;

    // Create payment intent if UPI
    let paymentData = null;
    if (paymentMethod === 'UPI') {
      paymentData = paymentService.generateUpiIntent({
        orderId: bookingId,
        amount: pricing.totalAmount,
        note: `Machinery Rental ${machine.name}`,
      });
    }

    const booking = await RentalBookings.create({
      id: bookingId,
      userId,
      farmerName: req.user.name,
      farmerPhone: req.user.mobileNumber,
      machineId: machine.id,
      machineName: machine.name,
      machineType: machine.type,
      machineImage: machine.image,
      ownerName: machine.ownerName,
      ownerPhone: machine.ownerPhone,
      startDate,
      startTime,
      durationHours: Number(durationHours),
      durationDays: Number(durationDays),
      withOperator: !!withOperator,
      withDelivery: !!withDelivery,
      deliveryAddress: deliveryAddress || `${req.user.village || 'Village'}, ${req.user.district || 'Dharwad'}`,
      pricing,
      paymentMethod,
      paymentStatus: paymentMethod === 'UPI' ? 'PENDING' : 'PENDING_AFTER_WORK',
      status: 'CONFIRMED', // CONFIRMED, DISPATCHED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED
      trackingStages: [
        { stage: 'Booking Accepted', done: true, time: 'Just now' },
        { stage: 'Machine Preparing', done: false, time: 'Upcoming' },
        { stage: 'Machine Dispatched', done: false, time: 'Upcoming' },
        { stage: 'Machine Near You', done: false, time: 'Upcoming' },
        { stage: 'Machine Delivered to Farm', done: false, time: 'Upcoming' },
        { stage: 'Rental Work In Progress', done: false, time: 'Upcoming' },
        { stage: 'Rental Completed', done: false, time: 'Upcoming' },
      ],
    });

    // Create In-App Notification
    await Notifications.create({
      userId,
      title: `🚜 Booking Confirmed: ${machine.name}`,
      body: `Your booking for ${startDate} at ${startTime} has been received. Owner: ${machine.ownerName} (${machine.ownerPhone})`,
      type: 'RENTAL',
      read: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Farm machine booking confirmed!',
      booking,
      paymentData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get farmer's rentals
 */
const getMyRentals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let rentals = await RentalBookings.find({ userId });

    if (status && status !== 'all') {
      rentals = rentals.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    }

    // Sort newest first
    rentals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      success: true,
      rentals,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rental detail
 */
const getRentalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await RentalBookings.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Rental booking not found',
      });
    }
    return res.json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Advance rental tracking status (Admin / Machine Owner / Simulation)
 */
const updateRentalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, currentStageIndex } = req.body;

    const booking = await RentalBookings.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    let stages = [...(booking.trackingStages || TRACKING_STAGES_TEMPLATE)];
    if (currentStageIndex !== undefined) {
      stages = stages.map((stg, idx) => ({
        ...stg,
        done: idx <= currentStageIndex,
        time: idx <= currentStageIndex ? (stg.done ? stg.time : 'Updated now') : 'Upcoming',
      }));
    }

    const updated = await RentalBookings.findByIdAndUpdate(id, {
      status: status || booking.status,
      trackingStages: stages,
    });

    return res.json({
      success: true,
      message: 'Rental status updated',
      booking: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel rental booking
 */
const cancelRentalBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await RentalBookings.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'COMPLETED' || booking.status === 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Active or completed rentals cannot be cancelled',
      });
    }

    const updated = await RentalBookings.findByIdAndUpdate(id, {
      status: 'CANCELLED',
    });

    return res.json({
      success: true,
      message: 'Rental booking cancelled successfully',
      booking: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRentalBooking,
  getMyRentals,
  getRentalById,
  updateRentalStatus,
  cancelRentalBooking,
};
