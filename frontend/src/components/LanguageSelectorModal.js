import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

export const LanguageSelectorModal = ({ visible, onClose }) => {
  const { currentLanguage, setLanguage, supportedLanguages, t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          <View style={styles.header}>
            <Text style={styles.title}>🌐 Select Your Language / ಭಾಷೆ</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose your preferred language. All buttons and farm details will update instantly.
          </Text>

          <View style={styles.list}>
            {supportedLanguages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langRow, isSelected && styles.langRowActive]}
                  onPress={() => {
                    setLanguage(lang.code);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nativeText, isSelected && styles.nativeTextActive]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={styles.regionText}>
                      {lang.label} ({lang.region})
                    </Text>
                  </View>
                  {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.l,
  },
  dialogCard: {
    backgroundColor: Colors.cardSurface,
    width: '100%',
    maxWidth: 400,
    borderRadius: Spacing.borderRadiusLarge,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  list: {
    gap: 8,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Spacing.borderRadiusButton,
    backgroundColor: '#F8FAF8',
    borderWidth: 1.5,
    borderColor: '#DCE5DC',
  },
  langRowActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  nativeText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  nativeTextActive: {
    color: Colors.primary,
  },
  regionText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
});
