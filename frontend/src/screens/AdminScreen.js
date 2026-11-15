/**
 * AdminScreen.js
 * Native React Native Admin Console inside the app.
 * Full replacement for the browser-based admin console.
 * Tabs: Dashboard | Orders | Catalog | People | More
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';

const STEEL = '#37474F';
const STEEL_LIGHT = '#ECEFF1';
const GREEN = '#1B5E20';
const RED = '#C62828';
const AMBER = '#E65100';
const BLUE = '#1565C0';

const rupees = (paise) => `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const ORDER_NEXT_ACTIONS = {
  PLACED: [
    { status: 'CONFIRMED', label: '✓ Confirm' },
    { status: 'CANCELLED', label: '✕ Cancel', style: 'danger' },
  ],
  CONFIRMED: [
    { status: 'PACKED', label: '📦 Pack & Assign Driver' },
    { status: 'CANCELLED', label: '✕ Cancel', style: 'danger' },
  ],
  PACKED: [{ status: 'OUT_FOR_DELIVERY', label: '🚚 Out for Delivery' }],
  OUT_FOR_DELIVERY: [{ status: 'DELIVERED', label: '✔ Mark Delivered' }],
};

const Badge = ({ text, color = STEEL }) => (
  <View style={[styles.badge, { backgroundColor: color + '22' }]}>
    <Text style={[styles.badgeText, { color }]}>{text}</Text>
  </View>
);

// ── Tab 1: Dashboard ────────────────────────────────────────────────────────
const DashboardTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState([]);

  const load = useCallback(async () => {
    try {
      const s = await api.get('/admin/stats');
      setStats(s);
    } catch (e) {
      // non-fatal
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live activity stream
  useRealtime(['order:updated', 'rental:updated', 'location:update'], (payload, event) => {
    const act = {
      id: `${event}-${Date.now()}`,
      event,
      title:
        event === 'order:updated'
          ? `Order #${payload.humanId || payload.id?.slice(0, 8)} ${payload.status}`
          : event === 'rental:updated'
          ? `Rental #${payload.humanId || payload.id?.slice(0, 8)} ${payload.status}`
          : `Driver ${payload.driverName || 'ping'} at [${payload.latitude?.toFixed(2)}, ${payload.longitude?.toFixed(2)}]`,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setActivities((prev) => [act, ...prev].slice(0, 20));
    load();
  });

  if (loading) return <ActivityIndicator color={STEEL} size="large" style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}
    >
      <Text style={styles.sectionTitle}>Platform Health</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats?.farmers ?? '—'}</Text>
          <Text style={styles.statLbl}>🌾 Farmers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats ? `${stats.ordersToday} / ${stats.orders}` : '—'}</Text>
          <Text style={styles.statLbl}>📦 Orders (today/total)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats?.activeRentals ?? '—'}</Text>
          <Text style={styles.statLbl}>🚜 Active Rentals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats ? rupees((stats.orderRevenuePaise || 0) + (stats.rentalRevenuePaise || 0)) : '—'}</Text>
          <Text style={styles.statLbl}>💰 Total GMV</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats?.pendingKyc ?? '—'}</Text>
          <Text style={styles.statLbl}>📑 Pending KYC</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats?.lowStock ?? '—'}</Text>
          <Text style={styles.statLbl}>⚠️ Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats ? `${stats.owners} / ${stats.drivers}` : '—'}</Text>
          <Text style={styles.statLbl}>🧑‍🔧 Owners / Drivers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{stats ? `${stats.products} / ${stats.machines}` : '—'}</Text>
          <Text style={styles.statLbl}>🗂️ Products / Machines</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>⚡ Live Stream</Text>
      {activities.length === 0 && (
        <Text style={styles.emptyText}>Waiting for live activity (orders, rentals, GPS pings)...</Text>
      )}
      {activities.map((a) => (
        <View key={a.id} style={styles.activityRow}>
          <Text style={styles.activityDot}>●</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityTitle}>{a.title}</Text>
            <Text style={styles.activityTime}>{a.time}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ── Tab 2: Orders & Rentals ────────────────────────────────────────────────
const OrdersTab = () => {
  const [subTab, setSubTab] = useState('orders'); // 'orders' | 'rentals'
  const [orders, setOrders] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [o, r] = await Promise.all([
        api.get('/admin/orders').catch(() => []),
        api.get('/admin/rentals').catch(() => []),
      ]);
      setOrders(Array.isArray(o) ? o : []);
      setRentals(Array.isArray(r) ? r : []);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtime(['order:updated', 'rental:updated'], () => load());

  const updateOrderStatus = async (orderId, status) => {
    if (status === 'CANCELLED') {
      Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => doUpdate(orderId, status) },
      ]);
      return;
    }
    await doUpdate(orderId, status);
  };

  const doUpdate = async (orderId, status) => {
    setBusyId(orderId);
    try {
      await api.post(`/admin/orders/${orderId}/status`, { status });
      await load();
    } catch (e) {
      Alert.alert('Update Failed', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const filteredOrders = orders.filter((o) => (filter === 'ALL' ? true : o.status === filter));

  if (loading) return <ActivityIndicator color={STEEL} size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-tab switcher */}
      <View style={styles.subTabBar}>
        <TouchableOpacity style={[styles.subTab, subTab === 'orders' && styles.subTabActive]} onPress={() => setSubTab('orders')}>
          <Text style={[styles.subTabText, subTab === 'orders' && styles.subTabTextActive]}>Orders ({orders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTab, subTab === 'rentals' && styles.subTabActive]} onPress={() => setSubTab('rentals')}>
          <Text style={[styles.subTabText, subTab === 'rentals' && styles.subTabTextActive]}>Rentals ({rentals.length})</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'orders' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chipBarInner}>
            {['ALL', 'PLACED', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
              <TouchableOpacity key={st} style={[styles.chip, filter === st && styles.chipActive]} onPress={() => setFilter(st)}>
                <Text style={[styles.chipText, filter === st && styles.chipTextActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
            {filteredOrders.length === 0 && <Text style={styles.emptyText}>No orders found.</Text>}
            {filteredOrders.map((o) => {
              const actions = ORDER_NEXT_ACTIONS[o.status] || [];
              return (
                <View key={o.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardRef}>{o.humanId || o.id?.slice(0, 8)}</Text>
                    <Badge text={o.status} color={o.status === 'DELIVERED' ? GREEN : o.status === 'CANCELLED' ? RED : AMBER} />
                  </View>
                  <Text style={styles.cardLine}>👨‍🌾 {o.user?.name || 'Farmer'} · {o.user?.phone}</Text>
                  <Text style={styles.cardLine}>💰 {rupees(o.totalPaise)} · {fmtDate(o.createdAt)}</Text>
                  {o.deliveryJob?.driver && (
                    <Text style={styles.cardLine}>🚚 Driver: {o.deliveryJob.driver.name} ({o.deliveryJob.driver.phone})</Text>
                  )}
                  {actions.length > 0 && (
                    <View style={styles.actionRow}>
                      {actions.map((act) => (
                        <TouchableOpacity
                          key={act.status}
                          style={[styles.actionBtn, act.style === 'danger' ? styles.dangerBtn : styles.primaryActionBtn]}
                          disabled={busyId === o.id}
                          onPress={() => updateOrderStatus(o.id, act.status)}
                        >
                          <Text style={[styles.actionBtnText, act.style === 'danger' && { color: RED }]}>
                            {busyId === o.id ? '…' : act.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}

      {subTab === 'rentals' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          {rentals.length === 0 && <Text style={styles.emptyText}>No machinery rentals yet.</Text>}
          {rentals.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardRef}>{r.humanId || r.id?.slice(0, 8)}</Text>
                <Badge text={r.status} color={r.status === 'COMPLETED' ? GREEN : r.status === 'CANCELLED' ? RED : AMBER} />
              </View>
              <Text style={styles.cardLine}>🚜 {r.machine?.name || 'Machine'}</Text>
              <Text style={styles.cardLine}>👨‍🌾 {r.user?.name} · {r.user?.phone}</Text>
              <Text style={styles.cardLine}>💰 {rupees(r.totalPaise)} · {r.durationHours || 4} hrs</Text>
              <Text style={styles.cardLine}>📅 {fmtDate(r.startDate)}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// ── Tab 3: Catalog & Stock ─────────────────────────────────────────────────
const CatalogTab = () => {
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [subTab, setSubTab] = useState('products'); // 'products' | 'coupons'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: '', maxDiscount: '', minOrder: '' });
  const [showAddCoupon, setShowAddCoupon] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get('/admin/products').catch(() => []),
        api.get('/admin/coupons').catch(() => []),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setCoupons(Array.isArray(c) ? c : []);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtime(['stock:updated', 'catalog:changed', 'coupons:changed'], () => load());

  const adjustStock = async (variantId, delta) => {
    try {
      await api.post('/admin/products/stock/adjust', {
        variantId,
        quantity: delta,
        type: delta > 0 ? 'INWARD' : 'ADJUSTMENT_DAMAGE',
        reason: 'Adjusted from mobile admin app',
      });
      load();
    } catch (e) {
      Alert.alert('Stock Update Failed', e.message);
    }
  };

  const toggleProduct = async (id) => {
    try {
      await api.post(`/admin/products/${id}/toggle`);
      load();
    } catch (e) {
      Alert.alert('Toggle Failed', e.message);
    }
  };

  const createCoupon = async () => {
    if (!couponForm.code || !couponForm.discountPercent) {
      Alert.alert('Required', 'Enter coupon code and discount percentage');
      return;
    }
    try {
      await api.post('/admin/coupons', couponForm);
      setCouponForm({ code: '', discountPercent: '', maxDiscount: '', minOrder: '' });
      setShowAddCoupon(false);
      load();
    } catch (e) {
      Alert.alert('Coupon Creation Failed', e.message);
    }
  };

  if (loading) return <ActivityIndicator color={STEEL} size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabBar}>
        <TouchableOpacity style={[styles.subTab, subTab === 'products' && styles.subTabActive]} onPress={() => setSubTab('products')}>
          <Text style={[styles.subTabText, subTab === 'products' && styles.subTabTextActive]}>Products ({products.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTab, subTab === 'coupons' && styles.subTabActive]} onPress={() => setSubTab('coupons')}>
          <Text style={[styles.subTabText, subTab === 'coupons' && styles.subTabTextActive]}>Coupons ({coupons.length})</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'products' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          {products.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <TouchableOpacity onPress={() => toggleProduct(p.id)}>
                  <Badge text={p.isActive ? 'ACTIVE' : 'HIDDEN'} color={p.isActive ? GREEN : RED} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardLine}>📦 Brand: {p.brand?.name || 'Kisan Kendra'} · Category: {p.category?.name || '—'}</Text>
              {(p.variants || []).map((v) => (
                <View key={v.id} style={styles.variantRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.variantName}>{v.packSize} — {rupees(v.pricePaise)}</Text>
                    <Text style={[styles.variantStock, v.stock < 10 && { color: RED, fontWeight: '800' }]}>
                      Stock: {v.stock} units
                    </Text>
                  </View>
                  <View style={styles.stockBtns}>
                    <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(v.id, 10)}>
                      <Text style={styles.stockBtnText}>+10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.stockBtn} onPress={() => adjustStock(v.id, 50)}>
                      <Text style={styles.stockBtnText}>+50</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.stockBtn, { borderColor: RED }]} onPress={() => adjustStock(v.id, -1)}>
                      <Text style={[styles.stockBtnText, { color: RED }]}>-1</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {subTab === 'coupons' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setShowAddCoupon(true)}>
            <Text style={[styles.actionBtnText, { textAlign: 'center' }]}>+ Create Coupon</Text>
          </TouchableOpacity>
          {coupons.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardRef}>{c.code}</Text>
                <Badge text={c.isActive ? 'ACTIVE' : 'EXPIRED'} color={c.isActive ? GREEN : RED} />
              </View>
              <Text style={styles.cardLine}>🏷️ {c.discountPercent}% Off · Max Discount: {rupees(c.maxDiscountPaise)}</Text>
              <Text style={styles.cardLine}>Min Order: {rupees(c.minOrderPaise)} · Uses: {c.usedCount || 0}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add Coupon Modal */}
      <Modal visible={showAddCoupon} transparent animationType="slide" onRequestClose={() => setShowAddCoupon(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Create Discount Coupon</Text>
            <TextInput style={styles.input} placeholder="Coupon Code (e.g. KISAN20)" value={couponForm.code} onChangeText={(v) => setCouponForm({ ...couponForm, code: v.toUpperCase() })} />
            <TextInput style={styles.input} placeholder="Discount Percentage (e.g. 15)" keyboardType="numeric" value={couponForm.discountPercent} onChangeText={(v) => setCouponForm({ ...couponForm, discountPercent: v })} />
            <TextInput style={styles.input} placeholder="Max Discount in ₹ (e.g. 500)" keyboardType="numeric" value={couponForm.maxDiscount} onChangeText={(v) => setCouponForm({ ...couponForm, maxDiscount: v })} />
            <TextInput style={styles.input} placeholder="Min Order Value in ₹ (e.g. 1000)" keyboardType="numeric" value={couponForm.minOrder} onChangeText={(v) => setCouponForm({ ...couponForm, minOrder: v })} />
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => setShowAddCoupon(false)}>
                <Text style={[styles.actionBtnText, { color: RED }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.primaryActionBtn]} onPress={createCoupon}>
                <Text style={styles.actionBtnText}>Save Coupon</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Tab 4: People (KYC, Users, Drivers) ───────────────────────────────────
const PeopleTab = () => {
  const [subTab, setSubTab] = useState('kyc'); // 'kyc' | 'users' | 'drivers'
  const [kycData, setKycData] = useState({ owners: [], drivers: [] });
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [k, u, d] = await Promise.all([
        api.get('/admin/kyc').catch(() => ({ owners: [], drivers: [] })),
        api.get('/admin/users').catch(() => []),
        api.get('/admin/drivers').catch(() => []),
      ]);
      setKycData(k || { owners: [], drivers: [] });
      setUsers(Array.isArray(u) ? u : []);
      setDrivers(Array.isArray(d) ? d : []);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtime(['user:updated', 'job:updated'], () => load());

  const reviewKyc = async (kind, id, action) => {
    if (action === 'REJECT') {
      setRejectModal({ kind, id });
      setRejectReason('');
      return;
    }
    try {
      await api.post(`/admin/kyc/${kind}/${id}/review`, { action: 'APPROVE' });
      load();
    } catch (e) {
      Alert.alert('KYC Review Failed', e.message);
    }
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Enter rejection reason');
      return;
    }
    try {
      await api.post(`/admin/kyc/${rejectModal.kind}/${rejectModal.id}/review`, {
        action: 'REJECT',
        rejectionReason: rejectReason.trim(),
      });
      setRejectModal(null);
      load();
    } catch (e) {
      Alert.alert('Rejection Failed', e.message);
    }
  };

  const toggleBlock = async (u) => {
    Alert.alert(
      u.isBlocked ? 'Unblock User' : 'Block User',
      `${u.isBlocked ? 'Unblock' : 'Block'} access for ${u.name || u.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: u.isBlocked ? 'Unblock' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/admin/users/${u.id}/block`);
              load();
            } catch (e) {
              Alert.alert('Block Action Failed', e.message);
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator color={STEEL} size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabBar}>
        <TouchableOpacity style={[styles.subTab, subTab === 'kyc' && styles.subTabActive]} onPress={() => setSubTab('kyc')}>
          <Text style={[styles.subTabText, subTab === 'kyc' && styles.subTabTextActive]}>
            KYC ({(kycData.owners?.length || 0) + (kycData.drivers?.length || 0)})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTab, subTab === 'users' && styles.subTabActive]} onPress={() => setSubTab('users')}>
          <Text style={[styles.subTabText, subTab === 'users' && styles.subTabTextActive]}>Users ({users.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTab, subTab === 'drivers' && styles.subTabActive]} onPress={() => setSubTab('drivers')}>
          <Text style={[styles.subTabText, subTab === 'drivers' && styles.subTabTextActive]}>Drivers ({drivers.length})</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'kyc' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          <Text style={styles.sectionTitle}>🚜 Machine Owners</Text>
          {(kycData.owners || []).map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{o.businessName || o.user?.name || 'Owner'}</Text>
                <Badge text={o.kycStatus} color={o.kycStatus === 'APPROVED' ? GREEN : o.kycStatus === 'REJECTED' ? RED : AMBER} />
              </View>
              <Text style={styles.cardLine}>📱 {o.user?.phone} · PAN: {o.panNumber} · Bank: {o.bankAccountNumber}</Text>
              {o.kycStatus === 'PENDING_APPROVAL' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.primaryActionBtn]} onPress={() => reviewKyc('owners', o.id, 'APPROVE')}>
                    <Text style={styles.actionBtnText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => reviewKyc('owners', o.id, 'REJECT')}>
                    <Text style={[styles.actionBtnText, { color: RED }]}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>🚚 Drivers</Text>
          {(kycData.drivers || []).map((d) => (
            <View key={d.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{d.name}</Text>
                <Badge text={d.kycStatus} color={d.kycStatus === 'APPROVED' ? GREEN : d.kycStatus === 'REJECTED' ? RED : AMBER} />
              </View>
              <Text style={styles.cardLine}>📱 {d.phone} · License: {d.licenceNumber}</Text>
              {d.kycStatus === 'PENDING_APPROVAL' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.primaryActionBtn]} onPress={() => reviewKyc('drivers', d.id, 'APPROVE')}>
                    <Text style={styles.actionBtnText}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => reviewKyc('drivers', d.id, 'REJECT')}>
                    <Text style={[styles.actionBtnText, { color: RED }]}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {subTab === 'users' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          {users.map((u) => (
            <View key={u.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{u.name || 'Unnamed'}</Text>
                <Badge text={u.role} color={u.role === 'ADMIN' ? STEEL : u.role === 'OWNER' ? AMBER : u.role === 'DRIVER' ? BLUE : GREEN} />
              </View>
              <Text style={styles.cardLine}>📱 {u.phone} {u.village ? `· 📍 ${u.village}, ${u.district || ''}` : ''}</Text>
              <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Badge text={u.isBlocked ? 'BLOCKED' : 'ACTIVE'} color={u.isBlocked ? RED : GREEN} />
                <TouchableOpacity style={[styles.actionBtn, u.isBlocked ? styles.primaryActionBtn : styles.dangerBtn]} onPress={() => toggleBlock(u)}>
                  <Text style={[styles.actionBtnText, !u.isBlocked && { color: RED }]}>{u.isBlocked ? 'Unblock' : 'Block'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {subTab === 'drivers' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          {drivers.map((d) => (
            <View key={d.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{d.name}</Text>
                <Badge text={d.isAvailable ? 'ONLINE' : 'OFFLINE'} color={d.isAvailable ? GREEN : STEEL} />
              </View>
              <Text style={styles.cardLine}>📱 {d.phone} · License: {d.licenceNumber}</Text>
              {d.vehicle && <Text style={styles.cardLine}>🚚 Vehicle: {d.vehicle.vehicleNumber} ({d.vehicle.vehicleType})</Text>}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Reject Modal */}
      <Modal visible={!!rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Rejection Reason</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="State reason (e.g. Unclear documents, mismatch)"
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => setRejectModal(null)}>
                <Text style={[styles.actionBtnText, { color: RED }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: RED }]} onPress={submitReject}>
                <Text style={styles.actionBtnText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Tab 5: More (Service Areas, Audit Logs, Logout) ────────────────────────
const MoreTab = ({ onLogout }) => {
  const [subTab, setSubTab] = useState('areas'); // 'areas' | 'audit'
  const [areas, setAreas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [areaForm, setAreaForm] = useState({ name: '', pincode: '', deliveryFee: '49', freeAbove: '999' });
  const [showAddArea, setShowAddArea] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([
        api.get('/admin/service-areas').catch(() => []),
        api.get('/admin/audit-logs').catch(() => []),
      ]);
      setAreas(Array.isArray(a) ? a : []);
      setLogs(Array.isArray(l) ? l : []);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addArea = async () => {
    if (!areaForm.name || !areaForm.pincode) {
      Alert.alert('Required', 'Enter name and 6-digit pincode');
      return;
    }
    try {
      await api.post('/admin/service-areas', areaForm);
      setAreaForm({ name: '', pincode: '', deliveryFee: '49', freeAbove: '999' });
      setShowAddArea(false);
      load();
    } catch (e) {
      Alert.alert('Area Save Failed', e.message);
    }
  };

  if (loading) return <ActivityIndicator color={STEEL} size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabBar}>
        <TouchableOpacity style={[styles.subTab, subTab === 'areas' && styles.subTabActive]} onPress={() => setSubTab('areas')}>
          <Text style={[styles.subTabText, subTab === 'areas' && styles.subTabTextActive]}>Service Areas ({areas.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subTab, subTab === 'audit' && styles.subTabActive]} onPress={() => setSubTab('audit')}>
          <Text style={[styles.subTabText, subTab === 'audit' && styles.subTabTextActive]}>Audit Logs ({logs.length})</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'areas' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setShowAddArea(true)}>
            <Text style={[styles.actionBtnText, { textAlign: 'center' }]}>+ Add Service Area</Text>
          </TouchableOpacity>
          {areas.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{a.name} ({a.pincode})</Text>
                <Badge text={a.isActive ? 'ACTIVE' : 'INACTIVE'} color={a.isActive ? GREEN : RED} />
              </View>
              <Text style={styles.cardLine}>Fee: {rupees(a.deliveryFeePaise)} · Free Above: {rupees(a.minOrderFreeDeliveryPaise)}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {subTab === 'audit' && (
        <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[STEEL]} />}>
          {logs.map((l) => (
            <View key={l.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardRef}>{l.action}</Text>
                <Text style={styles.cardLine}>{fmtDate(l.createdAt)}</Text>
              </View>
              <Text style={styles.cardLine}>Actor: {l.actor?.name || l.actor?.email || 'System'}</Text>
              <Text style={styles.cardLine}>Entity: {l.entity} · ID: {l.entityId?.slice(0, 8)}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add Service Area Modal */}
      <Modal visible={showAddArea} transparent animationType="slide" onRequestClose={() => setShowAddArea(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Service Area</Text>
            <TextInput style={styles.input} placeholder="Area / Taluk Name" value={areaForm.name} onChangeText={(v) => setAreaForm({ ...areaForm, name: v })} />
            <TextInput style={styles.input} placeholder="6-digit Pincode" keyboardType="numeric" maxLength={6} value={areaForm.pincode} onChangeText={(v) => setAreaForm({ ...areaForm, pincode: v })} />
            <TextInput style={styles.input} placeholder="Delivery Fee in ₹ (default 49)" keyboardType="numeric" value={areaForm.deliveryFee} onChangeText={(v) => setAreaForm({ ...areaForm, deliveryFee: v })} />
            <TextInput style={styles.input} placeholder="Free delivery above in ₹ (default 999)" keyboardType="numeric" value={areaForm.freeAbove} onChangeText={(v) => setAreaForm({ ...areaForm, freeAbove: v })} />
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => setShowAddArea(false)}>
                <Text style={[styles.actionBtnText, { color: RED }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.primaryActionBtn]} onPress={addArea}>
                <Text style={styles.actionBtnText}>Save Area</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.logoutFooterBtn} onPress={onLogout}>
        <Text style={styles.logoutFooterText}>🚪 Sign Out from Admin Console</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Main AdminScreen ─────────────────────────────────────────────────────────
const MAIN_TABS = [
  { key: 'dashboard', label: 'Dashboard', emoji: '📊' },
  { key: 'orders', label: 'Orders', emoji: '📋' },
  { key: 'catalog', label: 'Catalog', emoji: '📦' },
  { key: 'people', label: 'People', emoji: '👥' },
  { key: 'more', label: 'More', emoji: '⚙️' },
];

export const AdminScreen = ({ onLogout }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🛠️ Kisan Kendra Admin</Text>
          <Text style={styles.headerSub}>{user?.name || 'Administrator'} · Control Tower</Text>
        </View>
        <TouchableOpacity style={styles.headerLogout} onPress={onLogout}>
          <Text style={styles.headerLogoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'more' && <MoreTab onLogout={onLogout} />}
      </View>

      {/* Bottom Nav Bar */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {MAIN_TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.navBtn, isActive && styles.navBtnActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={styles.navEmoji}>{t.emoji}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: STEEL,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#B0BEC5', fontSize: 12, marginTop: 2 },
  headerLogout: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerLogoutText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navBtnActive: { opacity: 1 },
  navEmoji: { fontSize: 20 },
  navLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 2 },
  navLabelActive: { color: STEEL, fontWeight: '800' },

  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: STEEL },
  subTabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  subTabTextActive: { color: STEEL, fontWeight: '800' },

  chipBar: { backgroundColor: '#fff', maxHeight: 44 },
  chipBarInner: { paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#F1F5F9' },
  chipActive: { backgroundColor: STEEL },
  chipText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#fff' },

  content: { flex: 1, padding: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 30, fontSize: 13 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statVal: { fontSize: 18, fontWeight: '900', color: STEEL },
  statLbl: { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  activityDot: { color: GREEN, fontSize: 12, marginTop: 2 },
  activityTitle: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
  activityTime: { fontSize: 10, color: '#94A3B8', marginTop: 2 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardRef: { fontWeight: '800', fontSize: 13, color: STEEL, fontFamily: 'monospace' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', flex: 1 },
  cardLine: { fontSize: 12, color: '#475569', marginTop: 3 },

  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, minHeight: 32, justifyContent: 'center' },
  primaryActionBtn: { backgroundColor: STEEL },
  dangerBtn: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
  },
  variantName: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  variantStock: { fontSize: 11, color: '#64748B', marginTop: 2 },
  stockBtns: { flexDirection: 'row', gap: 4 },
  stockBtn: { borderWidth: 1, borderColor: STEEL, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 4 },
  stockBtnText: { fontSize: 11, fontWeight: '800', color: STEEL },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: '#fff',
  },

  logoutFooterBtn: {
    margin: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    alignItems: 'center',
  },
  logoutFooterText: { color: RED, fontWeight: '800', fontSize: 13 },
});
