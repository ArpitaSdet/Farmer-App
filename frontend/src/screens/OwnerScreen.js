import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';
import { ChatModal } from '../components/ChatModal';
import { confirmAsync } from '../services/ui';

const ORANGE = '#E65100';

const STATUS_LABEL = {
  CONFIRMED: 'NEW REQUEST',
  MACHINE_ASSIGNED: 'ACCEPTED',
  OPERATOR_ASSIGNED: 'OPERATOR ASSIGNED',
  DISPATCHED: 'DISPATCHED',
  NEAR_FARM: 'NEAR FARM',
  ARRIVED: 'AT FARM',
  STARTED: 'WORK IN PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

// Next actions an owner can take for each booking state
const ACTIONS = {
  CONFIRMED: [
    { status: 'MACHINE_ASSIGNED', label: '✓ Accept', style: 'accept' },
    { status: 'CANCELLED', label: '✕ Decline', style: 'reject' },
  ],
  MACHINE_ASSIGNED: [{ status: 'DISPATCHED', label: '🚚 Mark Dispatched', style: 'accept' }],
  OPERATOR_ASSIGNED: [{ status: 'DISPATCHED', label: '🚚 Mark Dispatched', style: 'accept' }],
  DISPATCHED: [{ status: 'ARRIVED', label: '📍 Reached Farm', style: 'accept' }],
  NEAR_FARM: [{ status: 'ARRIVED', label: '📍 Reached Farm', style: 'accept' }],
  ARRIVED: [{ status: 'STARTED', label: '▶ Start Field Work', style: 'accept' }],
  STARTED: [{ status: 'COMPLETED', label: '✔ Work Completed', style: 'accept' }],
};

const MACHINE_TYPES = ['Tractor', 'Harvester', 'Rotavator', 'Cultivator', 'Seed Drill', 'Sprayer', 'Thresher', 'Plough'];

export const OwnerScreen = ({ onLogout }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [data, setData] = useState({ machines: [], bookings: [], earnings: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [chat, setChat] = useState(null);
  const [addVisible, setAddVisible] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Tractor', hourlyRate: '', dailyRate: '', operatorAvailable: true });

  const load = useCallback(async () => {
    try {
      setData(await api.getOwnerDashboard());
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // New booking requests and status changes arrive live
  useRealtime(['rental:updated', 'notification:new'], () => load());

  const act = async (booking, status) => {
    if (status === 'CANCELLED' && !(await confirmAsync('Decline booking', `Decline ${booking.displayId}?`))) return;
    setBusyId(booking.id);
    try {
      await api.updateOwnerRental(booking.id, status);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleMachine = async (m) => {
    try {
      await api.updateOwnerMachine(m.id, { isAvailable: !m.isAvailable });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const addMachine = async () => {
    if (!form.name || !form.hourlyRate || !form.dailyRate) {
      alert('Please fill name, hourly and daily rate');
      return;
    }
    try {
      await api.addOwnerMachine({ ...form, hourlyRate: Number(form.hourlyRate), dailyRate: Number(form.dailyRate) });
      setAddVisible(false);
      setForm({ name: '', type: 'Tractor', hourlyRate: '', dailyRate: '', operatorAvailable: true });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const pending = data.bookings.filter((b) => b.status === 'CONFIRMED');
  const others = data.bookings.filter((b) => b.status !== 'CONFIRMED');

  const renderBooking = (b) => (
    <View key={b.id} style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardId}>#{b.displayId}</Text>
        <View style={[styles.badge, b.status === 'CONFIRMED' && { backgroundColor: '#FFF3E0' }, b.status === 'CANCELLED' && { backgroundColor: '#FFEBEE' }]}>
          <Text style={[styles.badgeText, b.status === 'CANCELLED' && { color: '#C62828' }]}>{STATUS_LABEL[b.status]}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{b.machineName}</Text>
      <Text style={styles.cardLine}>👨‍🌾 {b.farmerName} · {b.farmerPhone}</Text>
      <Text style={styles.cardLine}>📍 {b.village}</Text>
      <Text style={styles.cardLine}>
        📅 {b.startDate} {b.startTime} · ⏱ {b.durationHours} hrs · {b.includeOperator ? 'With operator' : 'Self-operated'}
      </Text>
      <Text style={styles.amount}>₹{b.totalAmount}</Text>
      <View style={styles.actionsRow}>
        {(ACTIONS[b.status] || [])
          // Trips handled by an assigned driver are advanced from the driver app (with OTP handover)
          .filter((a) => !(b.deliveryJob?.driverId && ['DISPATCHED', 'ARRIVED'].includes(a.status)))
          .map((a) => (
          <TouchableOpacity
            key={a.status}
            style={[styles.actionBtn, a.style === 'reject' ? styles.rejectBtn : styles.acceptBtn]}
            disabled={busyId === b.id}
            onPress={() => act(b, a.status)}
          >
            <Text style={[styles.actionText, a.style === 'reject' && { color: '#C62828' }]}>{a.label}</Text>
          </TouchableOpacity>
          ))}
        {b.deliveryJob?.driver && ['MACHINE_ASSIGNED', 'DISPATCHED', 'NEAR_FARM'].includes(b.status) && (
          <Text style={styles.cardLine}>🚚 Driver {b.deliveryJob.driver.name} is handling delivery</Text>
        )}
        {b.status !== 'CANCELLED' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.chatBtn]}
            onPress={() => setChat({ room: `rental:${b.id}`, title: `${b.farmerName} · ${b.displayId}` })}
          >
            <Text style={[styles.actionText, { color: '#1565C0' }]}>💬 Chat</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🚜 Owner Console</Text>
          <Text style={styles.headerSub}>
            {user?.name} · {data.machines.length} machines
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{data.earnings.pendingRequests ?? 0}</Text>
          <Text style={styles.statLabel}>New requests</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{data.earnings.activeJobs ?? 0}</Text>
          <Text style={styles.statLabel}>Active jobs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>₹{data.earnings.total ?? 0}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          ['bookings', `Bookings (${data.bookings.length})`],
          ['machines', 'My Machines'],
          ['earnings', 'Earnings'],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, activeTab === key && styles.tabActive]} onPress={() => setActiveTab(key)}>
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={ORANGE} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[ORANGE]} />}
        >
          {activeTab === 'bookings' && (
            <>
              {pending.length > 0 && <Text style={styles.section}>🔔 Waiting for your approval</Text>}
              {pending.map(renderBooking)}
              <Text style={styles.section}>All bookings</Text>
              {others.length === 0 && <Text style={styles.empty}>No other bookings yet.</Text>}
              {others.map(renderBooking)}
            </>
          )}

          {activeTab === 'machines' && (
            <>
              <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
                <Text style={styles.addText}>+ Add a machine</Text>
              </TouchableOpacity>
              {data.machines.map((m) => (
                <View key={m.id} style={styles.machineCard}>
                  {m.image ? <Image source={{ uri: m.image }} style={styles.machineImg} /> : <View style={styles.machineImg} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{m.name}</Text>
                    <Text style={styles.cardLine}>
                      ₹{m.hourlyRate}/hr · ₹{m.dailyRate}/day · {m._count?.rentals ?? 0} bookings
                    </Text>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.cardLine, { color: m.isAvailable ? '#2E7D32' : '#C62828', fontWeight: '700' }]}>
                        {m.isAvailable ? 'Visible to farmers' : 'Hidden / in service'}
                      </Text>
                      <Switch value={m.isAvailable} onValueChange={() => toggleMachine(m)} trackColor={{ true: '#FFB74D' }} thumbColor={m.isAvailable ? ORANGE : '#ccc'} />
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {activeTab === 'earnings' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Earnings summary</Text>
              <Text style={styles.earnRow}>Total earned (excl. deposits): ₹{data.earnings.total ?? 0}</Text>
              <Text style={styles.earnRow}>Completed jobs: {data.earnings.completedJobs ?? 0}</Text>
              <Text style={styles.earnRow}>Hours worked: {data.earnings.hoursWorked ?? 0}</Text>
              <Text style={styles.earnRow}>Active jobs: {data.earnings.activeJobs ?? 0}</Text>
              <Text style={[styles.cardLine, { marginTop: 10 }]}>Payouts are settled weekly to your registered bank account.</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add a machine</Text>
            <TextInput style={styles.input} placeholder="Machine name (e.g. John Deere 5050D)" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <View style={styles.typeRow}>
              {MACHINE_TYPES.map((tp) => (
                <TouchableOpacity key={tp} style={[styles.typeChip, form.type === tp && styles.typeChipActive]} onPress={() => setForm({ ...form, type: tp })}>
                  <Text style={[styles.typeText, form.type === tp && { color: '#fff' }]}>{tp}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Hourly rate (₹)" keyboardType="numeric" value={form.hourlyRate} onChangeText={(v) => setForm({ ...form, hourlyRate: v })} />
            <TextInput style={styles.input} placeholder="Daily rate (₹)" keyboardType="numeric" value={form.dailyRate} onChangeText={(v) => setForm({ ...form, dailyRate: v })} />
            <View style={styles.rowBetween}>
              <Text style={styles.cardLine}>Operator available</Text>
              <Switch value={form.operatorAvailable} onValueChange={(v) => setForm({ ...form, operatorAvailable: v })} />
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setAddVisible(false)}>
                <Text style={[styles.actionText, { color: '#C62828' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={addMachine}>
                <Text style={styles.actionText}>Save machine</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ChatModal visible={!!chat} room={chat?.room} title={chat?.title} onClose={() => setChat(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F2' },
  header: { backgroundColor: ORANGE, padding: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#FFE0B2', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: '#fff', fontWeight: '700' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFE0B2' },
  statVal: { fontSize: 20, fontWeight: '900', color: ORANGE },
  statLabel: { fontSize: 11, color: '#6D4C41', marginTop: 2 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, gap: 6 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFE0B2', alignItems: 'center' },
  tabActive: { backgroundColor: ORANGE },
  tabText: { fontWeight: '700', color: '#6D4C41', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  body: { flex: 1, padding: 12 },
  section: { fontWeight: '800', color: '#4E342E', marginVertical: 8, fontSize: 15 },
  empty: { color: '#8D6E63', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#FFE0B2' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardId: { fontWeight: '800', color: '#6D4C41' },
  badge: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#2E7D32' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#3E2723', marginTop: 6 },
  cardLine: { color: '#5D4037', marginTop: 3 },
  amount: { fontSize: 18, fontWeight: '900', color: ORANGE, marginTop: 6 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  acceptBtn: { backgroundColor: '#2E7D32' },
  rejectBtn: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  chatBtn: { backgroundColor: '#E3F2FD' },
  actionText: { color: '#fff', fontWeight: '800' },
  addBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: ORANGE, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  addText: { color: ORANGE, fontWeight: '800', fontSize: 15 },
  machineCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FFE0B2' },
  machineImg: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#FFE0B2' },
  earnRow: { fontSize: 15, color: '#3E2723', marginTop: 8, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#3E2723', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#D7CCC8', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  typeChip: { borderWidth: 1, borderColor: ORANGE, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  typeChipActive: { backgroundColor: ORANGE },
  typeText: { color: ORANGE, fontWeight: '700', fontSize: 12 },
});
