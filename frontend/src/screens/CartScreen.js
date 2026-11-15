import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import { api, rupees } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getDefaultAddressId } from '../services/bookings';

export const CartScreen = ({ visible, onClose, onOrderPlaced, onContinueShopping }) => {
  const { t } = useLanguage();
  const { cartItems, updateQuantity, removeFromCart, clearCart, itemsTotal, deliveryFee, grandTotal } = useCart();
  const { location } = useLocation();
  const { user } = useAuth();

  // Checkout flow state
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [farmerName, setFarmerName] = useState(user?.name || '');
  const [farmerPhone, setFarmerPhone] = useState(user?.phone || '');
  const [deliveryVillage, setDeliveryVillage] = useState(user?.village || location.village || '');
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    if (visible) api.getCoupons().then(setCoupons).catch(() => setCoupons([]));
  }, [visible]);

  // Re-evaluate the coupon whenever the cart total changes (mirrors server rules)
  const couponDiscount = appliedCoupon
    ? itemsTotal * 100 >= appliedCoupon.minOrderPaise
      ? Math.min(Math.round((itemsTotal * appliedCoupon.discountPercent) / 100), rupees(appliedCoupon.maxDiscountPaise))
      : 0
    : 0;
  const payable = Math.max(0, grandTotal - couponDiscount);

  const applyCoupon = async (code) => {
    setCouponError('');
    try {
      const c = await api.applyCoupon((code || couponCode).trim());
      if (itemsTotal * 100 < c.minOrderPaise) {
        throw new Error(`Add items worth ₹${rupees(c.minOrderPaise)} to use ${c.code}`);
      }
      setAppliedCoupon(c);
      setCouponCode(c.code);
    } catch (e) {
      setAppliedCoupon(null);
      setCouponError(e.message);
    }
  };
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); // RAZORPAY, COD
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  if (!visible) return null;

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    setOrderError('');
    try {
      const addressId = await getDefaultAddressId(location);
      const res = await api.createOrder({
        addressId,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        notes: `Deliver to ${farmerName} (${farmerPhone}), ${deliveryVillage}`,
      });
      setOrderSuccess({ id: res.order.displayId, totalAmount: res.order.totalAmount });
      setAppliedCoupon(null);
      setCouponCode('');
      clearCart();
    } catch (e) {
      setOrderError(e.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (orderSuccess) {
                setOrderSuccess(null);
                setIsCheckoutStep(false);
                onClose();
              } else if (isCheckoutStep) {
                setIsCheckoutStep(false);
              } else {
                onClose();
              }
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← {isCheckoutStep && !orderSuccess ? 'Back to Cart' : 'Close'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {orderSuccess ? '🎉 Order Placed' : isCheckoutStep ? '🌾 Farm Delivery Details' : t('cart')}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {orderSuccess ? (
          /* SUCCESS SCREEN */
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successEmoji}>🌾</Text>
            </View>
            <Text style={styles.successTitle}>Order Successfully Placed!</Text>
            <Text style={styles.successOrderId}>Order Reference: #{orderSuccess.id}</Text>
            <Text style={styles.successSub}>
              We are packing your order. Track it live in My Orders — you will get a delivery OTP when the driver starts.
            </Text>

            <View style={styles.successCard}>
              <View style={styles.successRow}>
                <Text style={styles.succLabel}>Total Paid / Payable:</Text>
                <Text style={styles.succVal}>₹{orderSuccess.totalAmount}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.succLabel}>Payment Mode:</Text>
                <Text style={styles.succVal}>{paymentMethod === 'RAZORPAY' ? 'Paid Online' : 'Cash on Delivery'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewOrdersBtn}
              onPress={() => {
                setOrderSuccess(null);
                setIsCheckoutStep(false);
                onClose();
                if (onOrderPlaced) onOrderPlaced();
              }}
            >
              <Text style={styles.viewOrdersText}>Track Delivery in My Orders →</Text>
            </TouchableOpacity>
          </View>
        ) : isCheckoutStep ? (
          /* CHECKOUT ADDRESS & PAYMENT SCREEN */
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeading}>1. Farm Delivery Address</Text>
            <View style={styles.formBox}>
              <Text style={styles.inputLabel}>Farmer Full Name</Text>
              <TextInput
                style={styles.input}
                value={farmerName}
                onChangeText={setFarmerName}
                placeholder="Ramesh Patil"
              />

              <Text style={styles.inputLabel}>Mobile Number (For Delivery Call)</Text>
              <TextInput
                style={styles.input}
                value={farmerPhone}
                onChangeText={setFarmerPhone}
                keyboardType="phone-pad"
                placeholder="9876543210"
              />

              <Text style={styles.inputLabel}>Village & Field Landmark</Text>
              <TextInput
                style={styles.input}
                value={deliveryVillage}
                onChangeText={setDeliveryVillage}
                placeholder="Village name, near Gram Panchayat / Survey No."
              />

              <Text style={styles.districtBadge}>
                📍 District: {location.district || 'Dharwad'}, {location.state || 'Karnataka'} ({location.pincode || '580031'})
              </Text>
            </View>

            <Text style={styles.sectionHeading}>2. Payment Method</Text>
            <View style={styles.paymentBox}>
              {/* Razorpay Online Option */}
              <TouchableOpacity
                style={[styles.paymentCard, paymentMethod === 'RAZORPAY' && styles.paymentCardActive]}
                onPress={() => setPaymentMethod('RAZORPAY')}
              >
                <Text style={styles.paymentEmoji}>💳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>Pay Online (UPI, Cards, Netbanking)</Text>
                  <Text style={styles.paymentSub}>Instant & verified via Google Pay, PhonePe, Cards & NetBanking</Text>
                </View>
                {paymentMethod === 'RAZORPAY' && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>

              {/* COD Option */}
              <TouchableOpacity
                style={[styles.paymentCard, paymentMethod === 'COD' && styles.paymentCardActive]}
                onPress={() => setPaymentMethod('COD')}
              >
                <Text style={styles.paymentEmoji}>💵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{t('payCod')}</Text>
                  <Text style={styles.paymentSub}>Pay delivery boy in cash when products reach your farm</Text>
                </View>
                {paymentMethod === 'COD' && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeading}>3. Kisan Coupon</Text>
            <View style={styles.couponBox}>
              <View style={styles.couponRow}>
                <TextInput
                  style={[styles.input, styles.couponInput]}
                  value={couponCode}
                  onChangeText={(v) => setCouponCode(v.toUpperCase())}
                  placeholder="Enter coupon code"
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.couponApply} onPress={() => applyCoupon()}>
                  <Text style={styles.couponApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
              {!!couponError && <Text style={styles.couponError}>{couponError}</Text>}
              {appliedCoupon && (
                <Text style={styles.couponOk}>
                  ✓ {appliedCoupon.code} applied — you save ₹{couponDiscount}
                </Text>
              )}
              {coupons.map((c) => (
                <TouchableOpacity key={c.id} style={styles.couponChip} onPress={() => applyCoupon(c.code)}>
                  <Text style={styles.couponChipCode}>🏷️ {c.code}</Text>
                  <Text style={styles.couponChipDesc}>
                    {c.discountPercent}% off up to ₹{rupees(c.maxDiscountPaise)}
                    {c.minOrderPaise ? ` on orders above ₹${rupees(c.minOrderPaise)}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bill Summary */}
            <View style={styles.billBox}>
              <Text style={styles.billHeading}>Order Bill Summary</Text>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Products Total:</Text>
                <Text style={styles.billValue}>₹{itemsTotal}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Farm Delivery Charge:</Text>
                <Text style={styles.billValue}>
                  {deliveryFee === 0 ? 'FREE (Orders ≥ ₹999)' : `₹${deliveryFee}`}
                </Text>
              </View>
              {couponDiscount > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Coupon Discount:</Text>
                  <Text style={[styles.billValue, { color: Colors.success }]}>−₹{couponDiscount}</Text>
                </View>
              )}
              <View style={styles.billDivider} />
              <View style={styles.billRowTotal}>
                <Text style={styles.billTotalLabel}>Grand Total:</Text>
                <Text style={styles.billTotalValue}>₹{payable}</Text>
              </View>
            </View>

            {!!orderError && <Text style={styles.couponError}>{orderError}</Text>}

            <TouchableOpacity
              style={styles.placeOrderBtn}
              onPress={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.placeOrderText}>{t('placeOrder')} (₹{payable}) →</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          /* CART ITEMS SCREEN */
          cartItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyTitle}>{t('cartEmpty')}</Text>
              <Text style={styles.emptySub}>
                Explore high germination seeds, fertilizers and farming tools.
              </Text>
              <TouchableOpacity style={styles.continueShopBtn} onPress={onContinueShopping || onClose}>
                <Text style={styles.continueShopText}>Start Shopping →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* Delivery Promise Badge */}
              <View style={styles.deliveryPromo}>
                <Text style={styles.promoEmoji}>🚚</Text>
                <Text style={styles.promoText}>
                  {itemsTotal >= 999
                    ? '✓ Congratulations! You unlocked FREE Farm Delivery.'
                    : `Add ₹${999 - itemsTotal} more for FREE Farm Delivery!`}
                </Text>
              </View>

              {/* Cart Items List */}
              {cartItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="contain" />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemBrand}>{item.brand}</Text>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemPack}>{item.packSize}</Text>
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                    {item.stock !== undefined && item.stock < item.quantity && (
                      <Text style={styles.couponError}>Only {item.stock} left in stock</Text>
                    )}

                    {/* Quantity Selector */}
                    <View style={styles.qtyControlRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeFromCart(item.productId)}
                      >
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {/* Total Summary */}
              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>{t('itemsTotal')}:</Text>
                  <Text style={styles.billValue}>₹{itemsTotal}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>{t('deliveryCharge')}:</Text>
                  <Text style={styles.billValue}>
                    {deliveryFee === 0 ? t('free') : `₹${deliveryFee}`}
                  </Text>
                </View>
                <View style={styles.billDivider} />
                <View style={styles.billRowTotal}>
                  <Text style={styles.billTotalLabel}>{t('total')}:</Text>
                  <Text style={styles.billTotalValue}>₹{grandTotal}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.proceedBtn}
                onPress={() => setIsCheckoutStep(true)}
              >
                <Text style={styles.proceedText}>{t('proceedToBuy')} (₹{grandTotal}) →</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          )
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  couponBox: {
    backgroundColor: Colors.cardSurface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput: { flex: 1, marginBottom: 0 },
  couponApply: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 12 },
  couponApplyText: { color: '#fff', fontWeight: '800' },
  couponError: { color: Colors.danger, fontWeight: '600', marginTop: 6 },
  couponOk: { color: Colors.success, fontWeight: '700', marginTop: 6 },
  couponChip: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.harvestGold,
    backgroundColor: Colors.harvestSurface,
  },
  couponChipCode: { fontWeight: '800', color: Colors.harvest },
  couponChipDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  container: {
    flex: 1,
    backgroundColor: '#F7FAF7',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    borderBottomWidth: 1,
    borderColor: '#E2EBE2',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  scrollArea: {
    flex: 1,
    padding: Spacing.l,
  },
  deliveryPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    marginBottom: 14,
  },
  promoEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  promoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadiusCard,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E0EAE0',
  },
  itemImage: {
    width: 80,
    height: 80,
    backgroundColor: '#F5FAF5',
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primaryMedium,
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  itemPack: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  billBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadiusCard,
    padding: 14,
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E0EAE0',
  },
  billHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  billValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E4ECE4',
    marginVertical: 8,
  },
  billRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  billTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
  },
  proceedBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  proceedText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },
  formBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#E0EAE0',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F5FAF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#C8D6C8',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  districtBadge: {
    fontSize: 12,
    color: Colors.primaryMedium,
    fontWeight: '600',
    marginTop: 10,
  },
  paymentBox: {
    gap: 10,
    marginBottom: 14,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#E0EAE0',
  },
  paymentCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F5E9',
  },
  paymentEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paymentSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  placeOrderBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  placeOrderText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  continueShopBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: Spacing.borderRadiusButton,
  },
  continueShopText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#81C784',
    marginBottom: 14,
  },
  successEmoji: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
  },
  successOrderId: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  successSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginVertical: 18,
    borderWidth: 1.5,
    borderColor: '#D8E2D8',
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  succLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  succVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  viewOrdersBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: Spacing.borderRadiusButton,
    width: '100%',
    alignItems: 'center',
  },
  viewOrdersText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
