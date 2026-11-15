import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const DEMO_ACCOUNTS = [
  { role: 'FARMER', phone: '9876543210', name: 'Ramesh Patil', label: 'Farmer', emoji: '👨‍🌾', color: Colors.primary },
  { role: 'OWNER', phone: '9845000001', name: 'Basavaraj Patil', label: 'Machine Owner', emoji: '🚜', color: '#E65100' },
  { role: 'DRIVER', phone: '9900000001', name: 'Suresh Naik', label: 'Delivery Driver', emoji: '🚚', color: '#1565C0' },
];

const ROLE_LABELS = { FARMER: '👨‍🌾 Farmer', OWNER: '🚜 Machine Owner', DRIVER: '🚚 Driver', ADMIN: '🛠️ Admin' };

export const LoginScreen = () => {
  const { loginWithOtp, chooseProfile, loading } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp | profile
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState(null);
  const [showServer, setShowServer] = useState(false);
  const [serverUrl, setServerUrl] = useState(api.serverUrl);

  const finishLogin = async (mobile, code, role) => {
    const res = await loginWithOtp(mobile, code, role);
    if (res.roles) {
      setProfiles(res);
      setStep('profile');
    }
  };

  const sendOtp = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setBusy(true);
    try {
      const res = await api.sendOtp(phone);
      setHint(res.demoOtp ? `Demo mode — your OTP is ${res.demoOtp}` : 'OTP sent by SMS');
      if (res.demoOtp) setOtp(res.demoOtp);
      setStep('otp');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError('');
    if (otp.length < 4) {
      setError('Enter the OTP');
      return;
    }
    try {
      await finishLogin(phone, otp);
    } catch (e) {
      setError(e.message);
    }
  };

  const demoLogin = async (acc) => {
    setError('');
    setBusy(true);
    try {
      const res = await api.sendOtp(acc.phone);
      if (!res.demoOtp) throw new Error('Demo login is disabled on this server');
      await finishLogin(acc.phone, res.demoOtp, acc.role);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveServer = async () => {
    await api.setServerUrl(serverUrl);
    setServerUrl(api.serverUrl);
    setShowServer(false);
  };

  const working = busy || loading;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.logo} onLongPress={() => setShowServer((v) => !v)}>
            🌾
          </Text>
          <Text style={styles.brand}>Kisan Kendra</Text>
          <Text style={styles.tagline}>Farm inputs & machinery rental, delivered to your field</Text>
        </View>

        <View style={styles.card}>
          {step === 'phone' && (
            <>
              <Text style={styles.label}>Mobile number</Text>
              <View style={styles.phoneRow}>
                <Text style={styles.prefix}>+91</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  keyboardType="phone-pad"
                  placeholder="10-digit number"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={10}
                />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={sendOtp} disabled={working}>
                {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Get OTP</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={styles.label}>Enter OTP sent to +91 {phone}</Text>
              {!!hint && <Text style={styles.hint}>{hint}</Text>}
              <TextInput
                style={styles.otpInput}
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="••••••"
                placeholderTextColor={Colors.textMuted}
                maxLength={6}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={verify} disabled={working}>
                {working ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify & Login</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')}>
                <Text style={styles.link}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'profile' && profiles && (
            <>
              <Text style={styles.label}>Continue as</Text>
              {profiles.roles.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.profileBtn}
                  disabled={working}
                  onPress={() => chooseProfile(profiles.tempToken, r).catch((e) => setError(e.message))}
                >
                  <Text style={styles.profileText}>{ROLE_LABELS[r] || r}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Text style={styles.demoTitle}>Demo accounts — tap to log in (OTP 123456)</Text>
        <View style={styles.demoRow}>
          {DEMO_ACCOUNTS.map((acc) => (
            <TouchableOpacity
              key={acc.role}
              style={[styles.demoCard, { borderColor: acc.color }]}
              onPress={() => demoLogin(acc)}
              disabled={working}
            >
              <Text style={styles.demoEmoji}>{acc.emoji}</Text>
              <Text style={[styles.demoLabel, { color: acc.color }]}>{acc.label}</Text>
              <Text style={styles.demoName}>{acc.name}</Text>
              <Text style={styles.demoPhone}>{acc.phone}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showServer && <Text style={styles.serverLink}>Server: {api.serverUrl}</Text>}
        {showServer && (
          <View style={styles.serverBox}>
            <TextInput
              style={styles.serverInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://your-server.onrender.com"
            />
            <TouchableOpacity style={styles.serverSave} onPress={saveServer}>
              <Text style={styles.primaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 28 },
  logo: { fontSize: 56 },
  brand: { fontSize: 30, fontWeight: '800', color: Colors.primary, marginTop: 6 },
  tagline: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  prefix: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary, marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 20, paddingVertical: 12, color: Colors.textPrimary, letterSpacing: 1 },
  otpInput: {
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    borderRadius: 12,
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: 10,
    paddingVertical: 12,
    color: Colors.textPrimary,
  },
  hint: {
    backgroundColor: Colors.harvestSurface,
    color: Colors.harvest,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  link: { color: Colors.primary, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  profileBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  profileText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  error: { color: Colors.danger, marginTop: 12, fontWeight: '600', textAlign: 'center' },
  demoTitle: { marginTop: 26, marginBottom: 10, fontWeight: '700', color: Colors.textSecondary, fontSize: 14 },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoCard: {
    flex: 1,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  demoEmoji: { fontSize: 26 },
  demoLabel: { fontWeight: '800', fontSize: 12, marginTop: 4, textAlign: 'center' },
  demoName: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  demoPhone: { fontSize: 11, color: Colors.textMuted },
  serverLink: { marginTop: 24, textAlign: 'center', color: Colors.textMuted, fontSize: 12 },
  serverBox: { flexDirection: 'row', marginTop: 8, gap: 8 },
  serverInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  serverSave: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
});
