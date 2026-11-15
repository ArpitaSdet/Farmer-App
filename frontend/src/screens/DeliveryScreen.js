import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { api, rupees } from '../services/api';
import { useRealtime } from '../services/realtime';
import { ChatModal } from '../components/ChatModal';

const BLUE = '#1565C0';
const PING_MS = 10000;

const NEXT_STEP = {
  ASSIGNED: { status: 'ACCEPTED', label: '✓ Accept Job' },
  ACCEPTED: { status: 'STARTED', label: '🚚 Picked up — Start Trip' },
  STARTED: { status: 'ARRIVED', label: '📍 Arrived at Farm' },
  ARRIVED: { status: 'DELIVERED', label: '🔐 Complete with OTP' },
};

const describeJob = (j) => {
  const isOrder = !!j.order;
  const src = j.order || j.rental || {};
  const addr = src.address || {};
  const codDue =
    isOrder && j.order.paymentMethod === 'COD' && j.order.paymentStatus !== 'PAID' ? rupees(j.order.totalPaise) : 0;
  return {
    isOrder,
    ref: src.humanId,
    customer: src.user?.name || 'Farmer',
    phone: src.user?.phone,
    address: `${addr.label ? `${addr.label}, ` : ''}${addr.village || ''}, ${addr.district || ''} ${addr.pincode || ''}`,
    items: isOrder
      ? (j.order.items || []).map((i) => `${i.productName} (${i.packSize}) ×${i.quantity}`).join(', ')
      : `${j.rental?.machine?.name} · ${j.rental?.durationHours} hrs`,
    codDue,
    room: isOrder ? `order:${j.orderId}` : `rental:${j.rentalId}`,
  };
};

export const DeliveryScreen = ({ onLogout }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [otpJob, setOtpJob] = useState(null);
  const [otp, setOtp] = useState('');
  const [cash, setCash] = useState('');
  const [chat, setChat] = useState(null);
  const [useGps, setUseGps] = useState(false);
  const simPos = useRef({}); // jobId -> {lat,lng} for simulated trips

  const load = useCallback(async () => {
    try {
      const [j, p] = await Promise.all([api.getDriverJobs(), api.getDriverProfile()]);
      setJobs(j);
      setProfile(p);
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

  // New assignments / cancellations show up instantly
  useRealtime(['job:updated', 'notification:new'], () => load());

  // Stream location for trips in progress (phone GPS, or a simulated drive towards the farm)
  useEffect(() => {
    const live = jobs.filter((j) => j.status === 'STARTED');
    if (!live.length) return undefined;
    let cancelled = false;
    const tick = async () => {
      for (const j of live) {
        try {
          let lat;
          let lng;
          if (useGps) {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } else {
            const cur = simPos.current[j.id] || { lat: j.pickupLat, lng: j.pickupLng };
            lat = cur.lat + (j.dropoffLat - cur.lat) * 0.2;
            lng = cur.lng + (j.dropoffLng - cur.lng) * 0.2;
            simPos.current[j.id] = { lat, lng };
          }
          if (!cancelled) await api.sendDriverLocation(j.id, lat, lng, 30);
        } catch (_) {
          // keep trying on the next tick
        }
      }
    };
    tick();
    const timer = setInterval(tick, PING_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobs, useGps]);

  const toggleGps = async (value) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission denied — using simulated route.');
        return;
      }
    }
    setUseGps(value);
  };

  const setOnline = async (value) => {
    try {
      await api.setDriverAvailability(value);
      setProfile((p) => (p ? { ...p, driver: { ...p.driver, isAvailable: value } } : p));
    } catch (e) {
      alert(e.message);
    }
  };

  const advance = async (job) => {
    const next = NEXT_STEP[job.status];
    if (!next) return;
    if (next.status === 'DELIVERED') {
      setOtpJob(job);
      setOtp('');
      setCash(String(describeJob(job).codDue || 0));
      return;
    }
    setBusyId(job.id);
    try {
      await api.updateJobStatus(job.id, next.status);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const complete = async () => {
    setBusyId(otpJob.id);
    try {
      await api.updateJobStatus(otpJob.id, 'DELIVERED', {
        otp,
        cashCollectedPaise: Math.round((Number(cash) || 0) * 100),
      });
      setOtpJob(null);
      delete simPos.current[otpJob.id];
      await load();
      alert('Handover complete ✔');
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const online = profile?.driver?.isAvailable ?? true;
  const history = profile?.history || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🚚 Driver App</Text>
          <Text style={styles.headerSub}>
            {user?.name} · {profile?.driver?.vehicle?.vehicleNumber || ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggles}>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>{online ? '🟢 Online' : '⚪ Offline'}</Text>
          <Switch value={online} onValueChange={setOnline} trackColor={{ true: '#90CAF9' }} thumbColor={online ? BLUE : '#ccc'} />
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>{useGps ? '📡 Phone GPS' : '🧭 Simulated route'}</Text>
          <Switch value={useGps} onValueChange={toggleGps} trackColor={{ true: '#90CAF9' }} thumbColor={useGps ? BLUE : '#ccc'} />
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          ['active', `Active (${jobs.length})`],
          ['history', `Completed (${history.length})`],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && { color: '#fff' }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[BLUE]} />}
        >
          {tab === 'active' && jobs.length === 0 && (
            <Text style={styles.empty}>No jobs assigned right now. New jobs appear here instantly.</Text>
          )}
          {tab === 'active' &&
            jobs.map((j) => {
              const d = describeJob(j);
              const next = NEXT_STEP[j.status];
              return (
                <View key={j.id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardType}>{d.isOrder ? '📦 INPUT DELIVERY' : '🚜 MACHINE DELIVERY'}</Text>
                    <Text style={styles.status}>{j.status}</Text>
                  </View>
                  <Text style={styles.cardRef}>#{d.ref}</Text>
                  <Text style={styles.cardLine}>👨‍🌾 {d.customer}</Text>
                  <Text style={styles.cardLine}>📍 {d.address}</Text>
                  <Text style={styles.cardLine}>🧾 {d.items}</Text>
                  {d.codDue > 0 && <Text style={styles.cod}>💵 Collect cash: ₹{d.codDue}</Text>}
                  {j.status === 'STARTED' && <Text style={styles.live}>● Sharing live location with farmer</Text>}
                  <View style={styles.actions}>
                    {next && (
                      <TouchableOpacity style={styles.primaryBtn} disabled={busyId === j.id} onPress={() => advance(j)}>
                        <Text style={styles.primaryText}>{busyId === j.id ? 'Updating…' : next.label}</Text>
                      </TouchableOpacity>
                    )}
                    <View style={styles.secondaryRow}>
                      {!!d.phone && (
                        <TouchableOpacity style={styles.secondaryBtn} onPress={() => Linking.openURL(`tel:${d.phone}`).catch(() => {})}>
                          <Text style={styles.secondaryText}>📞 Call</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() =>
                          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${j.dropoffLat},${j.dropoffLng}`).catch(() => {})
                        }
                      >
                        <Text style={styles.secondaryText}>🗺️ Navigate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={() => setChat({ room: d.room, title: `${d.customer} · ${d.ref}` })}>
                        <Text style={styles.secondaryText}>💬 Chat</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

          {tab === 'history' && (
            <>
              <View style={styles.summary}>
                <Text style={styles.summaryText}>Cash collected: ₹{rupees(profile?.cashCollectedPaise)}</Text>
                <Text style={styles.summaryText}>Jobs closed: {history.length}</Text>
              </View>
              {history.map((j) => {
                const d = describeJob(j);
                return (
                  <View key={j.id} style={styles.card}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardRef}>#{d.ref}</Text>
                      <Text style={[styles.status, j.status === 'FAILED' && { color: '#C62828' }]}>
                        {j.status === 'FAILED' ? 'CANCELLED' : 'DELIVERED'}
                      </Text>
                    </View>
                    <Text style={styles.cardLine}>👨‍🌾 {d.customer} · {d.address}</Text>
                    {!!j.cashCollectedPaise && <Text style={styles.cod}>Cash ₹{rupees(j.cashCollectedPaise)}</Text>}
                  </View>
                );
              })}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal visible={!!otpJob} transparent animationType="fade" onRequestClose={() => setOtpJob(null)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Customer handover OTP</Text>
            <Text style={styles.cardLine}>Ask the farmer for the 4-digit OTP shown in their app.</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="____"
              maxLength={4}
            />
            {otpJob && describeJob(otpJob).codDue > 0 && (
              <>
                <Text style={styles.cardLine}>Cash collected (₹)</Text>
                <TextInput style={styles.cashInput} value={cash} onChangeText={setCash} keyboardType="numeric" />
              </>
            )}
            <View style={styles.secondaryRow}>
              <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setOtpJob(null)}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={complete} disabled={otp.length !== 4}>
                <Text style={styles.primaryText}>Verify & Complete</Text>
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
  container: { flex: 1, backgroundColor: '#F3F7FC' },
  header: { backgroundColor: BLUE, padding: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#BBDEFB', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: '#fff', fontWeight: '700' },
  toggles: { flexDirection: 'row', gap: 8, padding: 12 },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  toggleLabel: { fontWeight: '700', color: '#0D47A1', fontSize: 12 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#BBDEFB', alignItems: 'center' },
  tabActive: { backgroundColor: BLUE },
  tabText: { fontWeight: '700', color: '#0D47A1' },
  body: { flex: 1, padding: 12 },
  empty: { textAlign: 'center', color: '#546E7A', marginTop: 40, paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#BBDEFB' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { fontWeight: '800', color: BLUE, fontSize: 12 },
  status: { fontWeight: '800', color: '#2E7D32', fontSize: 12 },
  cardRef: { fontSize: 16, fontWeight: '800', color: '#263238', marginTop: 4 },
  cardLine: { color: '#37474F', marginTop: 4 },
  cod: { marginTop: 6, fontWeight: '800', color: '#E65100' },
  live: { marginTop: 6, color: '#2E7D32', fontWeight: '700' },
  actions: { marginTop: 10 },
  primaryBtn: { backgroundColor: BLUE, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4, minHeight: 50, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondaryBtn: { flex: 1, backgroundColor: '#E3F2FD', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: BLUE, fontWeight: '700' },
  summary: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 12, marginBottom: 10 },
  summaryText: { fontWeight: '800', color: '#0D47A1', marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: '#263238' },
  otpInput: {
    borderWidth: 2,
    borderColor: BLUE,
    borderRadius: 10,
    fontSize: 30,
    letterSpacing: 14,
    textAlign: 'center',
    paddingVertical: 10,
    marginVertical: 12,
  },
  cashInput: { borderWidth: 1, borderColor: '#B0BEC5', borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 12, fontSize: 16 },
});
