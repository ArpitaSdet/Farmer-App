/**
 * LoginScreen.js
 * Clean, mobile-first sign-in & sign-up screen.
 * Supports: Farmer / Machine Owner / Delivery Partner / Admin
 * Flow: Choose role → Enter phone + name → OTP → Login
 */
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

const ROLE_OPTIONS = [
  {
    role: 'FARMER',
    label: 'Farmer',
    emoji: '👨‍🌾',
    color: '#1B5E20',
    description: 'Buy inputs & rent machines',
  },
  {
    role: 'OWNER',
    label: 'Machine Owner',
    emoji: '🚜',
    color: '#E65100',
    description: 'List & manage your machines',
  },
  {
    role: 'DRIVER',
    label: 'Delivery Partner',
    emoji: '🚚',
    color: '#1565C0',
    description: 'Deliver orders & machines',
  },
];

const ROLE_LABELS = {
  FARMER: '👨‍🌾 Farmer',
  OWNER: '🚜 Machine Owner',
  DRIVER: '🚚 Delivery Partner',
  ADMIN: '🛠️ Admin',
};

export const LoginScreen = () => {
  const { loginWithOtp, chooseProfile, loading } = useAuth();

  // step: 'role' | 'phone' | 'otp' | 'profile' | 'admin'
  const [step, setStep] = useState('role');
  const [selectedRole, setSelectedRole] = useState(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Check demo mode from server on mount
  useEffect(() => {
    api.getServerConfig()
      .then((cfg) => setIsDemoMode(!!cfg?.demoMode))
      .catch(() => setIsDemoMode(false));
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminTotp, setAdminTotp] = useState('');

  const working = busy || loading;

  const finishLogin = async (mobile, code, role) => {
    const res = await loginWithOtp(mobile, code, role);
    if (res.roles) {
      setProfiles(res);
      setStep('profile');
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRoleSelect = (roleObj) => {
    setSelectedRole(roleObj);
    setError('');
    setPhone('');
    setName('');
    setOtp('');
    setHint('');
    setStep('phone');
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
      if (res.demoOtp && isDemoMode) {
        setHint(`Demo OTP: ${res.demoOtp}`);
        setOtp(res.demoOtp);
      } else {
        setHint('OTP sent to your mobile number');
      }
      setResendTimer(30);
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
      setError('Enter the OTP sent to your number');
      return;
    }
    setBusy(true);
    try {
      await finishLogin(phone, otp, selectedRole?.role);
      // Best-effort: save name after login for new users
      if (name.trim()) {
        try { await api.updateProfile({ name: name.trim() }); } catch (_) {}
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAdminLogin = async () => {
    setError('');
    if (!adminEmail.trim() || !adminPassword) {
      setError('Enter email and password');
      return;
    }
    setBusy(true);
    try {
      const res = await api.adminLogin(adminEmail.trim(), adminPassword, adminTotp || undefined);
      await loginWithOtp(null, null, 'ADMIN', {
        adminToken: res.tokens.accessToken,
        adminUser: res.user,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step === 'phone') { setStep('role'); }
    else if (step === 'otp') { setStep('phone'); setOtp(''); setHint(''); }
    else if (step === 'profile') { setStep('otp'); }
    else if (step === 'admin') { setStep('role'); }
  };

  const resendOtp = () => {
    setOtp('');
    setHint('');
    setError('');
    sendOtp();
  };

  // ── Admin screen ───────────────────────────────────────────────────────────
  if (step === 'admin') {
    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.hero}>
            <Text style={styles.logo}>🛠️</Text>
            <Text style={[styles.brand, { color: '#37474F' }]}>Admin Portal</Text>
            <Text style={styles.tagline}>Kisan Kendra Control Tower</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Admin Email</Text>
            <TextInput
              style={styles.inputField}
              value={adminEmail}
              onChangeText={setAdminEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="admin@kisankendra.in"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.inputField}
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.label}>2FA Code (if enabled)</Text>
            <TextInput
              style={styles.inputField}
              value={adminTotp}
              onChangeText={setAdminTotp}
              keyboardType="number-pad"
              placeholder="6-digit code"
              placeholderTextColor={Colors.textMuted}
              maxLength={6}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#37474F', marginTop: 4 }]}
              onPress={handleAdminLogin}
              disabled={working}
            >
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Sign In to Admin Portal</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Main screens ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.logo}>🌾</Text>
          <Text style={styles.brand}>Kisan Kendra</Text>
          <Text style={styles.tagline}>Farm inputs & machinery rental, delivered to your field</Text>
        </View>

        {/* Back button */}
        {step !== 'role' && (
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}

        {/* ── STEP: Choose Role ───────────────────────────────── */}
        {step === 'role' && (
          <View>
            <Text style={styles.sectionTitle}>I am a…</Text>
            {ROLE_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.role}
                style={[styles.roleCard, { borderColor: r.color }]}
                onPress={() => handleRoleSelect(r)}
                activeOpacity={0.8}
              >
                <Text style={styles.roleEmoji}>{r.emoji}</Text>
                <View style={styles.roleInfo}>
                  <Text style={[styles.roleLabel, { color: r.color }]}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.description}</Text>
                </View>
                <Text style={{ color: r.color, fontSize: 20, fontWeight: '700' }}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.adminEntry}
              onPress={() => { setError(''); setStep('admin'); }}
            >
              <Text style={styles.adminEntryText}>🛠️ Admin Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: Phone + Name ─────────────────────────────── */}
        {step === 'phone' && selectedRole && (
          <View style={styles.card}>
            <View style={[styles.roleTag, { backgroundColor: selectedRole.color }]}>
              <Text style={styles.roleTagText}>{selectedRole.emoji} {selectedRole.label}</Text>
            </View>

            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.inputField}
              value={name}
              onChangeText={setName}
              placeholder="Full name (e.g. Ramesh Kumar)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>Mobile Number</Text>
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
                returnKeyType="done"
                onSubmitEditing={sendOtp}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: selectedRole.color }]}
              onPress={sendOtp}
              disabled={working}
            >
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Get OTP →</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footNote}>
              New users will be registered automatically with just your phone number & name.
            </Text>
          </View>
        )}

        {/* ── STEP: Verify OTP ──────────────────────────────── */}
        {step === 'otp' && (
          <View style={styles.card}>
            <View style={[styles.roleTag, { backgroundColor: selectedRole?.color || Colors.primary }]}>
              <Text style={styles.roleTagText}>{selectedRole?.emoji} {selectedRole?.label}</Text>
            </View>

            <Text style={styles.label}>OTP sent to +91 {phone}</Text>
            {!!hint && <Text style={styles.hintBox}>{hint}</Text>}

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="••••••"
              placeholderTextColor={Colors.textMuted}
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={verify}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: selectedRole?.color || Colors.primary }]}
              onPress={verify}
              disabled={working}
            >
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Verify & Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={resendOtp}
              disabled={working || resendTimer > 0}
            >
              <Text style={[styles.link, { color: resendTimer > 0 ? Colors.textMuted : Colors.primary }]}>
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: Profile Selection (multi-role user) ────── */}
        {step === 'profile' && profiles && (
          <View style={styles.card}>
            <Text style={styles.label}>Continue as…</Text>
            {profiles.roles.map((r) => {
              const roleColor =
                r === 'OWNER' ? '#E65100' : r === 'DRIVER' ? '#1565C0' : r === 'ADMIN' ? '#37474F' : Colors.primary;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.profileBtn, { borderColor: roleColor }]}
                  disabled={working}
                  onPress={() =>
                    chooseProfile(profiles.tempToken, r).catch((e) => setError(e.message))
                  }
                >
                  <Text style={[styles.profileText, { color: roleColor }]}>
                    {ROLE_LABELS[r] || r}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    flexGrow: 1,
  },

  hero: { alignItems: 'center', paddingVertical: 24 },
  logo: { fontSize: 52 },
  brand: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginTop: 6 },
  tagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 14,
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  roleEmoji: { fontSize: 32 },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 16, fontWeight: '800' },
  roleDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  adminEntry: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#78909C',
    borderRadius: 12,
    backgroundColor: '#ECEFF1',
  },
  adminEntryText: { color: '#37474F', fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  roleTag: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  roleTagText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  prefix: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 13,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },

  inputField: {
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: '#fff',
    marginBottom: 16,
  },

  otpInput: {
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    borderRadius: 12,
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 10,
    paddingVertical: 14,
    color: Colors.textPrimary,
    backgroundColor: '#fff',
    marginBottom: 16,
  },

  hintBox: {
    backgroundColor: '#FFF8E1',
    color: '#E65100',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },

  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  linkBtn: { marginTop: 12, alignItems: 'center' },
  link: { fontWeight: '600', fontSize: 14 },

  footNote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },

  profileBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  profileText: { fontSize: 16, fontWeight: '700' },

  error: {
    color: Colors.danger,
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 13,
  },
});
