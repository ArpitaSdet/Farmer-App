import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';
import { ChatModal } from '../components/ChatModal';
import { confirmAsync } from '../services/ui';

export const OrdersScreen = ({ initialTab = 'products' }) => {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState(initialTab); // 'products' or 'rentals'
  const [productOrders, setProductOrders] = useState([]);
  const [otps, setOtps] = useState({}); // orderId/rentalId -> handover OTP from notifications
  const [liveEta, setLiveEta] = useState({}); // orderId/rentalId -> { distanceKmRemaining, etaMinutes }
  const [chatRoom, setChatRoom] = useState(null);
  const [machineRentals, setMachineRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAllOrders = async () => {
    try {
      const [ordersRes, rentalsRes, notifRes] = await Promise.all([
        api.getMyOrders(),
        api.getMyRentals(),
        api.getNotifications().catch(() => ({ notifications: [] })),
      ]);
      setProductOrders(ordersRes.orders);
      setMachineRentals(rentalsRes.rentals);
      const codes = {};
      // Notifications are newest-first; keep the latest OTP per order / rental
      [...notifRes.notifications].reverse().forEach((n) => {
        const d = n.dataJson || {};
        if (d.deliveryOtp && d.orderId) codes[d.orderId] = d.deliveryOtp;
        if (d.handoverOtp && d.rentalId) codes[d.rentalId] = d.handoverOtp;
      });
      setOtps(codes);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Live status, OTP and driver-location updates pushed by the server
  useRealtime(['order:updated', 'rental:updated', 'notification:new', 'location:update'], (payload, event) => {
    if (event === 'order:updated') {
      const o = api.normalizeOrder(payload);
      setProductOrders((prev) => (prev.some((x) => x.id === o.id) ? prev.map((x) => (x.id === o.id ? o : x)) : [o, ...prev]));
    } else if (event === 'rental:updated') {
      const r = api.normalizeRental(payload);
      setMachineRentals((prev) => (prev.some((x) => x.id === r.id) ? prev.map((x) => (x.id === r.id ? r : x)) : [r, ...prev]));
    } else if (event === 'notification:new') {
      const d = payload.dataJson || {};
      if (d.deliveryOtp && d.orderId) setOtps((p) => ({ ...p, [d.orderId]: d.deliveryOtp }));
      if (d.handoverOtp && d.rentalId) setOtps((p) => ({ ...p, [d.rentalId]: d.handoverOtp }));
    } else if (event === 'location:update') {
      const key = payload.orderId || payload.rentalId;
      if (key) setLiveEta((p) => ({ ...p, [key]: payload }));
    }
  });

  useEffect(() => {
    loadAllOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllOrders();
  };

  const handleCancelOrder = async (orderId) => {
    if (!(await confirmAsync('Cancel order', 'Are you sure you want to cancel this order?'))) return;
    try {
      await api.cancelOrder(orderId);
      alert('Order cancelled successfully.');
      loadAllOrders();
    } catch (e) {
      alert(e.message || 'Could not cancel order');
    }
  };

  const handleCancelRental = async (rentalId) => {
    if (!(await confirmAsync('Cancel booking', 'Are you sure you want to cancel this machine booking?'))) return;
    try {
      await api.cancelRental(rentalId);
      alert('Machinery rental cancelled.');
      loadAllOrders();
    } catch (e) {
      alert(e.message || 'Could not cancel booking');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 {t('navOrders')}</Text>
        <Text style={styles.headerSub}>Live tracking of farm deliveries & machine bookings</Text>

        {/* Dual Mode Switch: Products vs Machinery */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'products' && styles.tabBtnActiveGreen]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              🌱 {t('tabProducts')} ({productOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'rentals' && styles.tabBtnActiveBrown]}
            onPress={() => setActiveTab('rentals')}
          >
            <Text style={[styles.tabText, activeTab === 'rentals' && styles.tabTextActive]}>
              🚜 {t('tabRentals')} ({machineRentals.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching your farm orders...</Text>
        </View>
      ) : activeTab === 'products' ? (
        /* PRODUCT ORDERS TAB */
        productOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>Your farm orders will appear here.</Text>
            <Text style={styles.emptySub}>
              Order seeds, fertilizers, or tools to see live delivery tracking.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
            }
          >
            {productOrders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                {/* Order Header */}
                <View style={styles.orderHeaderRow}>
                  <View>
                    <Text style={styles.orderIdText}>Order #{order.displayId}</Text>
                    <Text style={styles.orderDateText}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{order.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                {/* Items */}
                <View style={styles.itemsBlock}>
                  {order.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemName}>
                        • {item.name} ({item.quantity}x)
                      </Text>
                      <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total (Incl. Delivery):</Text>
                  <Text style={styles.totalAmount}>₹{order.totalAmount}</Text>
                </View>

                {/* Tracking Timeline */}
                <Text style={styles.timelineHeader}>🚚 Delivery Progress:</Text>
                <View style={styles.timelineBox}>
                  {(order.trackingSteps || []).map((step, sIdx) => (
                    <View key={sIdx} style={styles.timelineStep}>
                      <View style={styles.dotCol}>
                        <View style={[styles.timelineDot, step.completed && styles.dotCompleted]} />
                        {sIdx < (order.trackingSteps || []).length - 1 && (
                          <View
                            style={[
                              styles.timelineLine,
                              step.completed && styles.lineCompleted,
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text
                          style={[
                            styles.stepTitle,
                            step.completed && styles.stepTitleCompleted,
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={styles.stepTime}>{step.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {order.driver && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                  <View style={styles.liveBox}>
                    <Text style={styles.liveTitle}>
                      🚚 {order.driver.name} · {order.driver.vehicle}
                    </Text>
                    {liveEta[order.id] && (
                      <Text style={styles.liveSub}>
                        📍 {liveEta[order.id].distanceKmRemaining?.toFixed(1)} km away · ETA {liveEta[order.id].etaMinutes} min
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => setChatRoom({ room: `order:${order.id}`, title: `Order ${order.displayId} · Driver` })}
                    >
                      <Text style={styles.chatBtnText}>💬 Chat with driver</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {otps[order.id] && order.status === 'OUT_FOR_DELIVERY' && (
                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>Delivery OTP — share only when you receive the items</Text>
                    <Text style={styles.otpValue}>{otps[order.id]}</Text>
                  </View>
                )}
                <Text style={styles.payInfo}>
                  {order.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Paid online'} · {order.paymentStatus}
                </Text>

                {/* Cancel Button */}
                {(order.status === 'PLACED' || order.status === 'CONFIRMED') && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancelOrder(order.id)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel Order</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      ) : (
        /* MACHINERY RENTALS TAB */
        machineRentals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚜</Text>
            <Text style={styles.emptyTitle}>No machinery bookings yet.</Text>
            <Text style={styles.emptySub}>
              Rent a tractor, harvester, or rotavator to book field equipment.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.earth]} />
            }
          >
            {machineRentals.map((rental) => (
              <View key={rental.id} style={styles.rentalCard}>
                {/* Rental Header */}
                <View style={styles.rentalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rentalIdText}>Rental #{rental.displayId}</Text>
                    <Text style={styles.machineTitle}>{rental.machineName}</Text>
                    <Text style={styles.rentalSchedule}>
                      📅 {rental.startDate} at {rental.startTime}
                    </Text>
                  </View>
                  <View style={styles.rentalStatusBadge}>
                    <Text style={styles.rentalStatusText}>{rental.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                {/* Owner info & Call button */}
                <View style={styles.ownerBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ownerLabel}>Machine Owner:</Text>
                    <Text style={styles.ownerName}>{rental.ownerName}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callOwnerBtn}
                    onPress={() => alert(`Calling ${rental.ownerName}: ${rental.ownerPhone}`)}
                  >
                    <Text style={styles.callOwnerText}>📞 Call Owner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.callOwnerBtn, { backgroundColor: '#E3F2FD', marginLeft: 8 }]}
                    onPress={() => setChatRoom({ room: `rental:${rental.id}`, title: `${rental.machineName} · Owner` })}
                  >
                    <Text style={[styles.callOwnerText, { color: '#1565C0' }]}>💬 Chat</Text>
                  </TouchableOpacity>
                </View>

                {/* 7-Stage Rental Tracking Timeline */}
                <Text style={styles.timelineHeader}>🚜 7-Stage Machinery Status:</Text>
                <View style={styles.timelineBox}>
                  {(rental.trackingStages || []).map((stage, stIdx) => (
                    <View key={stIdx} style={styles.timelineStep}>
                      <View style={styles.dotCol}>
                        <View
                          style={[
                            styles.timelineDotBrown,
                            stage.done && styles.dotCompletedBrown,
                          ]}
                        />
                        {stIdx < (rental.trackingStages || []).length - 1 && (
                          <View
                            style={[
                              styles.timelineLine,
                              stage.done && styles.lineCompletedBrown,
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text
                          style={[
                            styles.stepTitle,
                            stage.done && styles.stepTitleCompletedBrown,
                          ]}
                        >
                          {stage.stage}
                        </Text>
                        <Text style={styles.stepTime}>{stage.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {otps[rental.id] && ['DISPATCHED', 'NEAR_FARM', 'MACHINE_ASSIGNED', 'CONFIRMED'].includes(rental.status) && (
                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>Machine handover OTP — share when the machine reaches your farm</Text>
                    <Text style={styles.otpValue}>{otps[rental.id]}</Text>
                  </View>
                )}
                {liveEta[rental.id] && ['DISPATCHED', 'NEAR_FARM'].includes(rental.status) && (
                  <Text style={styles.liveSub}>
                    📍 Machine {liveEta[rental.id].distanceKmRemaining?.toFixed(1)} km away · ETA {liveEta[rental.id].etaMinutes} min
                  </Text>
                )}
                <Text style={styles.payInfo}>Total ₹{rental.totalAmount} · {rental.paymentStatus}</Text>

                {['CONFIRMED', 'MACHINE_ASSIGNED', 'OPERATOR_ASSIGNED'].includes(rental.status) && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.cancelRentalBtn}
                      onPress={() => handleCancelRental(rental.id)}
                    >
                      <Text style={styles.cancelRentalText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      )}
      <ChatModal
        visible={!!chatRoom}
        room={chatRoom?.room}
        title={chatRoom?.title}
        onClose={() => setChatRoom(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  liveBox: {
    backgroundColor: Colors.infoSurface,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  liveTitle: { fontWeight: '700', color: Colors.info },
  liveSub: { color: Colors.textSecondary, marginTop: 6, fontWeight: '600' },
  chatBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.info,
  },
  chatBtnText: { color: Colors.info, fontWeight: '700' },
  otpBox: {
    backgroundColor: Colors.harvestSurface,
    borderWidth: 1,
    borderColor: Colors.harvestBorder,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  otpLabel: { fontSize: 12, color: Colors.harvest, fontWeight: '600', textAlign: 'center' },
  otpValue: { fontSize: 28, fontWeight: '900', letterSpacing: 8, color: Colors.earth, marginTop: 4 },
  payInfo: { marginTop: 8, fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: Spacing.l,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 12,
    color: '#C8E6C9',
    marginTop: 2,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: Spacing.borderRadiusButton,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBtnActiveGreen: {
    backgroundColor: '#FFFFFF',
  },
  tabBtnActiveBrown: {
    backgroundColor: Colors.earth,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E0ECE0',
  },
  tabTextActive: {
    color: '#000000',
  },
  list: {
    flex: 1,
    padding: Spacing.l,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadiusCard,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#D8E2D8',
    elevation: 2,
  },
  rentalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadiusCard,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    elevation: 2,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rentalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  rentalIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.earth,
  },
  orderDateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  machineTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  rentalSchedule: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  rentalStatusBadge: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BCAAA4',
  },
  rentalStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.earth,
  },
  itemsBlock: {
    backgroundColor: '#F8FAF8',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  itemName: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.primary,
  },
  ownerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEBE9',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  ownerLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ownerName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.earth,
  },
  callOwnerBtn: {
    backgroundColor: Colors.earth,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callOwnerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 8,
    marginBottom: 6,
  },
  timelineBox: {
    paddingLeft: 6,
    marginVertical: 6,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D0DDD0',
    marginTop: 3,
  },
  dotCompleted: {
    backgroundColor: Colors.primary,
  },
  timelineDotBrown: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D7CCC8',
    marginTop: 3,
  },
  dotCompletedBrown: {
    backgroundColor: Colors.earth,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0EAE0',
  },
  lineCompleted: {
    backgroundColor: Colors.primary,
  },
  lineCompletedBrown: {
    backgroundColor: Colors.earth,
  },
  stepContent: {
    marginLeft: 8,
    paddingBottom: 8,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  stepTitleCompleted: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stepTitleCompletedBrown: {
    color: Colors.earth,
    fontWeight: '700',
  },
  stepTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  advanceStageBtn: {
    flex: 1,
    backgroundColor: '#EFEBE9',
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.earth,
  },
  advanceStageText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.earth,
  },
  cancelRentalBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelRentalText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
