import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { api } from '../services/api';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';

export const ProfileScreen = ({ onNavigateOrders }) => {
  const { t, currentLanguage } = useLanguage();
  const { user, refreshProfile, logout } = useAuth();
  const isAdminMode = false;
  const [faqs, setFaqs] = useState([]);
  const [showFaqs, setShowFaqs] = useState(false);

  useEffect(() => {
    api.getFaqs().then(setFaqs).catch(() => setFaqs([]));
  }, []);
  const { location } = useLocation();

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [issueText, setIssueText] = useState('');

  // Editable Profile fields
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [farmSize, setFarmSize] = useState(user?.landSizeAcres ? String(user.landSizeAcres) : '');
  const [crops, setCrops] = useState((user?.mainCrops || []).join(', '));

  const handleSaveProfile = async () => {
    try {
      await api.updateProfile({
        name,
        landSizeAcres: parseFloat(farmSize) || undefined,
        mainCrops: crops.split(',').map((c) => c.trim()).filter(Boolean),
      });
      await refreshProfile();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSendReport = async () => {
    if (!issueText.trim()) return;
    try {
      const ticket = await api.createSupportTicket({
        subject: issueText.trim().slice(0, 60),
        message: issueText.trim(),
        category: 'GENERAL',
      });
      alert(`Ticket #${ticket.id.slice(0, 8).toUpperCase()} created. Our team will call you within 30 minutes.`);
      setIssueText('');
      setReportModalVisible(false);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header Card */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{isAdminMode ? '🛠️' : '👨‍🌾'}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userPhone}>📱 +91 {user?.mobileNumber || '9876543210'}</Text>
          <Text style={styles.userVillage}>
            🏡 {location.village}, {location.district}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setIsEditing((prev) => !prev)}
        >
          <Text style={styles.editText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Editing Form */}
      {isEditing && (
        <View style={styles.editCard}>
          <Text style={styles.formTitle}>Edit Farmer Details</Text>
          <Text style={styles.label}>Your Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Farm Land Size</Text>
          <TextInput style={styles.input} value={farmSize} onChangeText={setFarmSize} />

          <Text style={styles.label}>Primary Crops (comma separated)</Text>
          <TextInput style={styles.input} value={crops} onChangeText={setCrops} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveBtnText}>Save Profile Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Farm Land & Crop Summary Badges */}
      <View style={styles.farmMetricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Farm Size</Text>
          <Text style={styles.metricVal}>🌾 {farmSize ? `${farmSize} Acres` : "—"}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Main Crops</Text>
          <Text style={styles.metricVal}>🌱 {crops}</Text>
        </View>
      </View>

      
      {/* Quick Menu Options */}
      <Text style={styles.menuSectionHeader}>FARM SERVICES & SHORTCUTS</Text>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => onNavigateOrders('products')}
      >
        <Text style={styles.menuEmoji}>📦</Text>
        <Text style={styles.menuTitle}>My Farm Product Orders</Text>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => onNavigateOrders('rentals')}
      >
        <Text style={styles.menuEmoji}>🚜</Text>
        <Text style={styles.menuTitle}>My Machinery Bookings</Text>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => setLanguageModalVisible(true)}
      >
        <Text style={styles.menuEmoji}>🌐</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuTitle}>Preferred Language / ಭಾಷೆ</Text>
          <Text style={styles.menuSub}>Current: {currentLanguage.toUpperCase()}</Text>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => setSupportModalVisible(true)}
      >
        <Text style={styles.menuEmoji}>📞</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuTitle}>Kisan Support & Helpline</Text>
          <Text style={styles.menuSub}>Toll-free 1800-180-1551, WhatsApp & FAQs</Text>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => setReportModalVisible(true)}
      >
        <Text style={styles.menuEmoji}>📝</Text>
        <Text style={styles.menuTitle}>Report a Problem / Complaint</Text>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      {/* TODO [Phase 6 - AI Crop Doctor]: Connect photo upload to Gemini 1.5 Flash Vision for pest/leaf disease classification */}
      <TouchableOpacity
        style={[styles.menuRow, { backgroundColor: '#E8F5E9' }]}
        onPress={() => alert('AI Crop Doctor (Agro-Chat) deferred to v1.2. Please call Toll-Free Helpline: 1800-180-1551.')}
      >
        <Text style={styles.menuEmoji}>🌿</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuTitle, { color: '#2E7D32' }]}>AI Crop Doctor & Advisory (Upcoming)</Text>
          <Text style={styles.menuSub}>Upload crop leaf photo for disease diagnosis</Text>
        </View>
        <Text style={[styles.arrowIcon, { color: '#2E7D32' }]}>›</Text>
      </TouchableOpacity>

      {/* TODO [Phase 6 - Kisan Loyalty]: Introduce referral wallet ledger and points redemption at checkout */}
      <TouchableOpacity
        style={[styles.menuRow, { backgroundColor: '#FFF8E1' }]}
        onPress={() => alert('Kisan Rewards & Referral Points deferred to v1.2. Earn coins on future orders.')}
      >
        <Text style={styles.menuEmoji}>🪙</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuTitle, { color: '#F57F17' }]}>Kisan Loyalty Coins & Referrals</Text>
          <Text style={styles.menuSub}>Refer fellow farmers to earn booking credits</Text>
        </View>
        <Text style={[styles.arrowIcon, { color: '#F57F17' }]}>›</Text>
      </TouchableOpacity>

      <Text style={styles.menuSectionHeader}>ACCOUNT</Text>
      <View style={[styles.menuRow, { backgroundColor: '#FFF3E0' }]}>
        <Text style={styles.menuEmoji}>🚜</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuTitle, { color: '#E65100', fontWeight: 'bold' }]}>Own a machine or drive for us?</Text>
          <Text style={styles.menuSub}>Log out and sign in with your owner / driver mobile number</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Language Modal */}
      <LanguageSelectorModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* Support & Helpline Modal */}
      <Modal visible={supportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.supportSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📞 Kisan Sahayata Kendra</Text>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.supportDesc}>
              Direct agricultural expert support available 7 days a week from 6:00 AM to 10:00 PM.
            </Text>

            <TouchableOpacity
              style={styles.callCard}
              onPress={() => Linking.openURL('tel:18001801551').catch(() => alert('Call 1800-180-1551'))}
            >
              <Text style={styles.callCardEmoji}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.callCardTitle}>Call Toll-Free Helpline</Text>
                <Text style={styles.callCardNumber}>1800-180-1551</Text>
              </View>
              <Text style={styles.callBadge}>FREE CALL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsappCard}
              onPress={() => Linking.openURL('https://wa.me/919876543210').catch(() => alert('WhatsApp +91 98765 43210'))}
            >
              <Text style={styles.callCardEmoji}>💬</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.callCardTitle}>WhatsApp Agro-Expert</Text>
                <Text style={styles.callCardNumber}>+91 98765 43210</Text>
              </View>
              <Text style={styles.chatBadge}>CHAT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.faqCard}
              onPress={() => setShowFaqs((v) => !v)}
            >
              <Text style={styles.callCardEmoji}>❓</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.callCardTitle}>Frequently Asked Questions (FAQs)</Text>
                <Text style={styles.faqSub}>Payments, delivery, OTP, rentals</Text>
              </View>
              <Text style={styles.arrowIcon}>{showFaqs ? '⌄' : '›'}</Text>
            </TouchableOpacity>
            {showFaqs && (
              <ScrollView style={{ maxHeight: 260 }}>
                {faqs.map((f) => (
                  <View key={f.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: Colors.divider }}>
                    <Text style={{ fontWeight: '700', color: Colors.textPrimary }}>{f.question}</Text>
                    <Text style={{ color: Colors.textSecondary, marginTop: 2 }}>{f.answer}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Report Problem Modal */}
      <Modal visible={reportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.reportDialog}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📝 Report a Problem</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.reportDesc}>
              Let us know if you faced issues with machinery rental or product delivery.
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="Describe your issue or feedback..."
              multiline
              numberOfLines={4}
              value={issueText}
              onChangeText={setIssueText}
            />

            <TouchableOpacity style={styles.submitTicketBtn} onPress={handleSendReport}>
              <Text style={styles.submitTicketText}>Submit to Kisan Sahayak</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.l,
    borderBottomLeftRadius: Spacing.borderRadiusLarge,
    borderBottomRightRadius: Spacing.borderRadiusLarge,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userPhone: {
    fontSize: 13,
    color: '#E0ECE0',
    marginTop: 2,
  },
  userVillage: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.harvestYellow,
    marginTop: 3,
  },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  editCard: {
    backgroundColor: '#FFFFFF',
    margin: Spacing.l,
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#C8D8C8',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5FAF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#C8D6C8',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  farmMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.l,
    marginVertical: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#D8E2D8',
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  adminTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3E2723',
    marginHorizontal: Spacing.l,
    marginBottom: 16,
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 2,
    borderColor: '#8D6E63',
  },
  adminIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5D4037',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminIconEmoji: {
    fontSize: 22,
  },
  adminTileTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminTileSub: {
    fontSize: 11,
    color: '#D7CCC8',
    marginTop: 2,
    lineHeight: 15,
  },
  menuSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.l,
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.l,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E8EFE8',
  },
  menuEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  menuSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '700',
    marginLeft: 8,
  },
  logoutBtn: {
    margin: Spacing.l,
    paddingVertical: 14,
    borderRadius: Spacing.borderRadiusButton,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    alignItems: 'center',
  },
  logoutText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  supportSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Spacing.borderRadiusLarge,
    borderTopRightRadius: Spacing.borderRadiusLarge,
    padding: Spacing.l,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMuted,
    padding: 6,
  },
  supportDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#81C784',
    marginBottom: 10,
  },
  callCardEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  callCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  callCardNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: 2,
  },
  callBadge: {
    backgroundColor: Colors.primary,
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  whatsappCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#80CBC4',
    marginBottom: 10,
  },
  chatBadge: {
    backgroundColor: '#00796B',
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  faqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#FFF59D',
    marginBottom: 20,
  },
  faqSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reportDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadiusLarge,
    padding: Spacing.l,
    margin: Spacing.l,
  },
  reportDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#F5FAF5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8D6C8',
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  submitTicketBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  submitTicketText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
