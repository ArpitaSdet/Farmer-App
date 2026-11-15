import { Router } from 'express';
import { authenticate, requireRole, auditLog } from '../middleware/auth';
import {
  createCategory,
  createProduct,
  adjustStock,
  createMachine,
  createSignedUploadUrl,
} from '../controllers/adminCatalogController';
import { getAdminRealtimeDrivers } from '../controllers/trackingController';
import {
  reviewOwnerKyc,
  reviewDriverKyc,
  approveDriverDevice,
  inviteDriver,
} from '../controllers/authController';
import {
  adminStats,
  adminOrders,
  adminRentals,
  adminUpdateOrder,
  adminUsers,
  adminToggleBlock,
  adminKyc,
  adminProducts,
  adminToggleProduct,
  adminMachines,
  adminDrivers,
  adminServiceAreas,
  adminUpsertServiceArea,
  adminAuditLogs,
  adminCoupons,
  adminCreateCoupon,
} from '../controllers/opsController';

export const adminRoutes = Router();

// Require ADMIN on all routes
adminRoutes.use(authenticate, requireRole('ADMIN'));

// Real-Time Fleet & Socket Telemetry
adminRoutes.get('/realtime/drivers', getAdminRealtimeDrivers);

// KYC & Driver Administration
adminRoutes.post('/kyc/owners/:id/review', auditLog('REVIEW_KYC', 'OwnerProfile'), reviewOwnerKyc);
adminRoutes.post('/kyc/drivers/:id/review', auditLog('REVIEW_KYC', 'Driver'), reviewDriverKyc);
adminRoutes.post('/drivers/:id/approve-device', auditLog('APPROVE_DEVICE', 'Driver'), approveDriverDevice);
adminRoutes.post('/drivers/invite', inviteDriver);

// Catalog Management with Audit Logging
adminRoutes.post('/categories', auditLog('CREATE', 'Category'), createCategory);
adminRoutes.post('/products', auditLog('CREATE', 'Product'), createProduct);
adminRoutes.post('/products/stock/adjust', auditLog('ADJUST_STOCK', 'ProductVariant'), adjustStock);
adminRoutes.post('/machines', auditLog('CREATE', 'Machine'), createMachine);
adminRoutes.post('/uploads/sign', createSignedUploadUrl);

// Live operations console
adminRoutes.get('/stats', adminStats);
adminRoutes.get('/orders', adminOrders);
adminRoutes.post('/orders/:id/status', auditLog('UPDATE_STATUS', 'Order'), adminUpdateOrder);
adminRoutes.get('/rentals', adminRentals);
adminRoutes.get('/users', adminUsers);
adminRoutes.post('/users/:id/block', auditLog('TOGGLE_BLOCK', 'User'), adminToggleBlock);
adminRoutes.get('/kyc', adminKyc);
adminRoutes.get('/products', adminProducts);
adminRoutes.post('/products/:id/toggle', auditLog('TOGGLE_PUBLISH', 'Product'), adminToggleProduct);
adminRoutes.get('/machines', adminMachines);
adminRoutes.get('/drivers', adminDrivers);
adminRoutes.get('/service-areas', adminServiceAreas);
adminRoutes.post('/service-areas', auditLog('UPSERT', 'ServiceArea'), adminUpsertServiceArea);
adminRoutes.get('/audit-logs', adminAuditLogs);
adminRoutes.get('/coupons', adminCoupons);
adminRoutes.post('/coupons', auditLog('CREATE', 'Coupon'), adminCreateCoupon);
