import { api } from './api';

/** Resolve the farmer's default farm address, creating one from their location if none exists. */
export async function getDefaultAddressId(location) {
  const addresses = await api.getAddresses();
  if (addresses.length) return (addresses.find((a) => a.isDefault) || addresses[0]).id;
  const created = await api.addAddress({
    label: 'Farm',
    village: location?.village || 'Unkal',
    district: location?.district || 'Dharwad',
    state: location?.state || 'Karnataka',
    pincode: location?.pincode || '580031',
    isDefault: true,
  });
  return created.id;
}

/** Submit a booking from BookingModal and return a farmer-friendly confirmation message. */
export async function submitRentalBooking(bookingData, location) {
  const addressId = await getDefaultAddressId(location);
  const res = await api.createRentalBooking({
    machineId: bookingData.machineId,
    addressId,
    startDate: bookingData.startDate,
    durationHours: bookingData.durationHours,
    includeOperator: bookingData.includeOperator,
    deliveryRequired: bookingData.deliveryRequired,
    paymentMethod: bookingData.paymentMethod,
  });
  return `Booking ${res.booking.displayId} sent to the owner.\n\nHandover OTP: ${res.handoverOtp}\nShare it with the operator only when the machine reaches your farm.`;
}
