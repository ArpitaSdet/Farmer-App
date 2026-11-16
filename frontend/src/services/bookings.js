import { api } from './api';

/** Resolve the farmer's default farm address with real GPS coordinates, creating or updating one. */
export async function getDefaultAddressId(location) {
  const addresses = await api.getAddresses();
  if (addresses.length) {
    const def = addresses.find((a) => a.isDefault) || addresses[0];
    // If existing address lacks real coordinates, update it if location has them
    if ((!def.latitude || !def.longitude || (def.latitude === 15.3647 && def.longitude === 75.124)) && location?.latitude && location?.longitude) {
      try {
        await api.updateAddress(def.id, {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          village: location.village || def.village,
          district: location.district || def.district,
          pincode: location.pincode || def.pincode,
        });
      } catch (_) {}
    }
    return def.id;
  }

  const created = await api.addAddress({
    label: 'Farm',
    village: location?.village || 'Unkal',
    district: location?.district || 'Dharwad',
    state: location?.state || 'Karnataka',
    pincode: location?.pincode || '580031',
    latitude: Number(location?.latitude) || 15.3647,
    longitude: Number(location?.longitude) || 75.124,
    isDefault: true,
  });
  return created.id;
}

/** Submit a booking from BookingModal and return a farmer-friendly confirmation message. */
export async function submitRentalBooking(bookingData, location, selectedAddressId) {
  const activeLocation = bookingData?.deliveryCoords
    ? {
        ...location,
        latitude: bookingData.deliveryCoords.lat,
        longitude: bookingData.deliveryCoords.lng,
        village: bookingData.deliveryVillage || location?.village,
      }
    : location;
  const addressId =
    bookingData?.selectedAddressId || selectedAddressId || (await getDefaultAddressId(activeLocation));
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
