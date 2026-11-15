import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const SERVER_KEY = 'kk_server_url';

// Hosted backend baked in at build time (app.json -> expo.extra.apiUrl or EXPO_PUBLIC_API_URL).
const getDefaultServerUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const extra = Constants?.expoConfig?.extra?.apiUrl;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin?.startsWith('http')) {
    // Web build is served by the API server itself
    if (!window.location.origin.includes('localhost:8081')) return window.location.origin;
  }
  if (extra) return extra;
  return 'http://localhost:5000';
};

const stripSlash = (u) => (u || '').trim().replace(/\/+$/, '');

const rupees = (paise) => Math.round((paise || 0) / 100);

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

const ORDER_FLOW = [
  ['PLACED', 'Order Placed'],
  ['CONFIRMED', 'Confirmed'],
  ['PACKED', 'Packed'],
  ['OUT_FOR_DELIVERY', 'Out for Delivery'],
  ['DELIVERED', 'Delivered'],
];

const RENTAL_FLOW = [
  ['CONFIRMED', 'Booking Requested'],
  ['MACHINE_ASSIGNED', 'Owner Accepted'],
  ['DISPATCHED', 'Machine Dispatched'],
  ['NEAR_FARM', 'Machine Near You'],
  ['ARRIVED', 'Delivered to Farm'],
  ['STARTED', 'Work In Progress'],
  ['COMPLETED', 'Completed'],
];

class ApiService {
  constructor() {
    this.token = null;
    this.serverUrl = stripSlash(getDefaultServerUrl());
    this.onUnauthorized = null;
  }

  async init() {
    try {
      const saved = await AsyncStorage.getItem(SERVER_KEY);
      if (saved) this.serverUrl = stripSlash(saved);
    } catch (_) {}
    return this.serverUrl;
  }

  async setServerUrl(url) {
    this.serverUrl = stripSlash(url) || stripSlash(getDefaultServerUrl());
    try {
      await AsyncStorage.setItem(SERVER_KEY, this.serverUrl);
    } catch (_) {}
  }

  get baseUrl() {
    return `${this.serverUrl}/api/v1`;
  }

  setToken(token) {
    this.token = token;
  }

  resolveImage(url) {
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    return `${this.serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    let response;
    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
    } catch (e) {
      throw new Error('Cannot reach the Kisan Kendra server. Check your internet connection.');
    }

    let body = {};
    try {
      body = await response.json();
    } catch (_) {}

    if (response.status === 401 && this.token && this.onUnauthorized) {
      this.onUnauthorized();
    }
    if (!response.ok || body.success === false) {
      throw new Error(body?.error?.message || body?.message || 'Something went wrong. Please try again.');
    }
    return body.data !== undefined ? body.data : body;
  }

  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data || {}) });
  }

  patch(endpoint, data) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data || {}) });
  }

  /* ---------------- Normalizers: server models -> UI shapes ---------------- */

  normalizeProduct = (p) => {
    const variant = p.variants?.[0] || {};
    const price = rupees(variant.pricePaise);
    const mrp = rupees(variant.mrpPaise);
    return {
      ...p,
      id: p.id,
      productId: p.id,
      variantId: variant.id,
      name: p.name,
      brand: p.brand?.name || p.brand || 'Kisan Kendra',
      category: p.category?.slug,
      packSize: variant.packSize,
      price,
      mrp,
      discountPercentage: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
      stock: variant.stock ?? 0,
      inStock: (variant.stock ?? 0) > 0,
      image: this.resolveImage(p.images?.[0]?.url),
      rating: p.rating ?? 4.5,
      reviewCount: p.reviewCount ?? p.reviews?.length ?? 0,
      suitableCrops: p.suitableCrops || [],
      usageInstructions: p.safetyInfo || 'Follow the dosage printed on the pack.',
      dosage: p.safetyInfo,
      deliveryTime: '24-48 hrs',
      variantOptions: (p.variants || []).map((v) => ({
        id: v.id,
        packSize: v.packSize,
        price: rupees(v.pricePaise),
        mrp: rupees(v.mrpPaise),
        stock: v.stock,
      })),
    };
  };

  normalizeMachine = (m) => ({
    ...m,
    hourlyRate: rupees(m.hourlyRatePaise),
    dailyRate: rupees(m.dailyRatePaise),
    image: this.resolveImage(m.images?.[0]?.url),
    images: (m.images || []).map((i) => this.resolveImage(i.url)),
    ownerName: m.owner?.name || 'Verified Owner',
    ownerPhone: m.owner?.phone || '',
    location: [m.village, m.district].filter(Boolean).join(', ') || 'Dharwad',
    district: m.district || 'Dharwad',
    distanceKm: m.distanceKm != null ? Number(m.distanceKm.toFixed ? m.distanceKm.toFixed(1) : m.distanceKm) : 4.2,
    rating: m.rating ?? 4.5,
    operatorRatePerHour: 150,
    securityDeposit: Math.round(rupees(m.hourlyRatePaise) * 0.2 * 4),
    deliveryAvailable: true,
    deliveryRatePerKm: 0,
    horsepower: '',
  });

  normalizeOrder = (o) => {
    const reached = new Map((o.statusLogs || []).map((l) => [l.toStatus, l.createdAt]));
    reached.set('PLACED', o.createdAt);
    const idx = ORDER_FLOW.findIndex(([s]) => s === o.status);
    return {
      ...o,
      id: o.id,
      displayId: o.humanId,
      totalAmount: rupees(o.totalPaise),
      discountAmount: rupees(o.discountPaise),
      deliveryFee: rupees(o.deliveryFeePaise),
      items: (o.items || []).map((i) => ({
        name: i.productName,
        packSize: i.packSize,
        quantity: i.quantity,
        price: rupees(i.unitPricePaise),
      })),
      driver: o.deliveryJob?.driver
        ? {
            name: o.deliveryJob.driver.name,
            phone: o.deliveryJob.driver.phone,
            vehicle: o.deliveryJob.driver.vehicle?.vehicleNumber,
          }
        : null,
      trackingSteps:
        o.status === 'CANCELLED'
          ? [
              { title: 'Order Placed', time: fmtTime(o.createdAt), completed: true },
              { title: 'Cancelled', time: fmtTime(reached.get('CANCELLED')), completed: true },
            ]
          : ORDER_FLOW.map(([s, title], i) => ({
              title,
              time: i <= idx ? fmtTime(reached.get(s)) : '',
              completed: i <= idx,
            })),
    };
  };

  normalizeRental = (r) => {
    const reached = new Map((r.statusLogs || []).map((l) => [l.toStatus, l.createdAt]));
    const idx = RENTAL_FLOW.findIndex(([s]) => s === r.status);
    const start = new Date(r.startDate);
    return {
      ...r,
      displayId: r.humanId,
      machineName: r.machine?.name,
      machineImage: this.resolveImage(r.machine?.images?.[0]?.url),
      ownerName: r.machine?.owner?.name || 'Machine Owner',
      ownerPhone: r.machine?.owner?.phone || '',
      farmerName: r.user?.name,
      farmerPhone: r.user?.phone,
      village: r.address?.village || r.user?.village,
      startDate: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      startTime: start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      totalAmount: rupees(r.totalPaise),
      trackingStages:
        r.status === 'CANCELLED'
          ? [
              { stage: 'Booking Requested', time: fmtTime(r.createdAt), done: true },
              { stage: 'Cancelled', time: fmtTime(reached.get('CANCELLED')), done: true },
            ]
          : RENTAL_FLOW.map(([s, stage], i) => ({ stage, time: i <= idx ? fmtTime(reached.get(s)) : '', done: i <= idx })),
    };
  };

  /* ---------------- Auth ---------------- */

  sendOtp(mobileNumber) {
    return this.post('/auth/send-otp', { mobileNumber });
  }

  verifyOtp(payload) {
    return this.post('/auth/verify-otp', payload);
  }

  selectProfile(tempToken, role) {
    return this.post('/auth/select-profile', { tempToken, selectedRole: role });
  }

  getProfile() {
    return this.get('/auth/me');
  }

  updateProfile(profileData) {
    return this.request('/auth/me', { method: 'PUT', body: JSON.stringify(profileData) });
  }

  /* ---------------- Catalog ---------------- */

  async getHomeFeed() {
    const d = await this.get('/home');
    return {
      banners: (d.banners || []).map((b) => ({
        ...b,
        image: this.resolveImage(b.imageUrl),
        category: b.deepLink,
        subtitle: b.targetScreen === 'Rent' ? 'Book now' : 'Shop now',
      })),
      categories: (d.categories || []).map((c) => ({ ...c, icon: c.iconUrl })),
      products: (d.featuredProducts || []).map(this.normalizeProduct),
      machines: (d.featuredMachines || []).map(this.normalizeMachine),
    };
  }

  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const d = await this.get(`/products${query ? `?${query}` : ''}`);
    return { products: d.map(this.normalizeProduct) };
  }

  async getProductById(id) {
    return this.normalizeProduct(await this.get(`/products/${id}`));
  }

  async getMachines(params = {}) {
    const query = new URLSearchParams(params).toString();
    const d = await this.get(`/machines${query ? `?${query}` : ''}`);
    return { machines: d.map(this.normalizeMachine) };
  }

  getReviews(productId) {
    return this.get(`/products/${productId}/reviews`);
  }

  addReview(productId, rating, comment) {
    return this.post(`/products/${productId}/reviews`, { rating, comment });
  }

  getCoupons() {
    return this.get('/coupons');
  }

  /* ---------------- Cart, addresses, orders ---------------- */

  getCart() {
    return this.get('/cart');
  }

  addCartItem(variantId, quantity = 1) {
    return this.post('/cart/items', { variantId, quantity });
  }

  updateCartItem(cartItemId, quantity) {
    return this.request(`/cart/items/${cartItemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
  }

  removeCartItem(cartItemId) {
    return this.request(`/cart/items/${cartItemId}`, { method: 'DELETE' });
  }

  applyCoupon(code) {
    return this.post('/cart/coupon', { code, couponCode: code });
  }

  getAddresses() {
    return this.get('/addresses');
  }

  addAddress(address) {
    return this.post('/addresses', address);
  }

  async createOrder(orderData) {
    const d = await this.post('/orders', orderData);
    return { order: this.normalizeOrder({ ...d.order, items: [], statusLogs: [] }), razorpay: d.razorpay };
  }

  async getMyOrders() {
    const d = await this.get('/orders');
    return { orders: d.map(this.normalizeOrder) };
  }

  cancelOrder(id) {
    return this.post(`/orders/${id}/cancel`, { reason: 'Cancelled by farmer' });
  }

  /* ---------------- Rentals ---------------- */

  getRentalQuote(data) {
    return this.post('/rentals/quote', data);
  }

  async createRentalBooking(bookingData) {
    const d = await this.post('/rentals', bookingData);
    return { booking: this.normalizeRental({ ...d.rental, statusLogs: [] }), handoverOtp: d.rental.rawHandoverOtp };
  }

  async getMyRentals() {
    const d = await this.get('/rentals');
    return { rentals: d.map(this.normalizeRental) };
  }

  cancelRental(id) {
    return this.post(`/rentals/${id}/cancel`, { reason: 'Cancelled by farmer' });
  }

  rateRental(rentalId, rating, comment) {
    return this.post(`/rentals/${rentalId}/rate`, { rating, comment });
  }

  /* ---------------- Notifications & support ---------------- */

  async getNotifications() {
    const d = await this.get('/notifications');
    const list = Array.isArray(d) ? d : d.notifications || d.items || [];
    return { notifications: list };
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  }

  getFaqs() {
    return this.get('/support/faqs');
  }

  createSupportTicket(data) {
    return this.post('/support/tickets', data);
  }

  getTickets() {
    return this.get('/support/tickets');
  }

  /* ---------------- Machine owner ---------------- */

  async getOwnerDashboard() {
    const d = await this.get('/owner/dashboard');
    return {
      machines: d.machines.map(this.normalizeMachine),
      bookings: d.bookings.map(this.normalizeRental),
      earnings: { ...d.earnings, total: rupees(d.earnings.totalPaise) },
    };
  }

  addOwnerMachine(data) {
    return this.post('/owner/machines', data);
  }

  updateOwnerMachine(id, data) {
    return this.patch(`/owner/machines/${id}`, data);
  }

  updateOwnerRental(id, status) {
    return this.post(`/owner/rentals/${id}/status`, { status });
  }

  /* ---------------- Driver ---------------- */

  getDriverJobs() {
    return this.get('/driver/jobs');
  }

  getDriverProfile() {
    return this.get('/driver/profile');
  }

  setDriverAvailability(isAvailable) {
    return this.post('/driver/availability', { isAvailable });
  }

  updateJobStatus(jobId, status, extra = {}) {
    return this.post(`/driver/jobs/${jobId}/status`, { status, ...extra });
  }

  sendDriverLocation(jobId, latitude, longitude, speed) {
    return this.post('/driver/location', {
      pings: [{ jobId, latitude, longitude, speed, timestamp: new Date().toISOString() }],
    });
  }
}

export const api = new ApiService();
export { rupees };
