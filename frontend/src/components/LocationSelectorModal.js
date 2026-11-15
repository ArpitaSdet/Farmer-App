import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useLocation } from '../context/LocationContext';
import { useLanguage } from '../context/LanguageContext';

const PRESET_VILLAGES = [
  { village: 'Unkal Village', taluk: 'Hubballi', district: 'Dharwad', state: 'Karnataka', pincode: '580031' },
  { village: 'Navalgund Farm Road', taluk: 'Navalgund', district: 'Dharwad', state: 'Karnataka', pincode: '582208' },
  { village: 'Kundgol Agro Hub', taluk: 'Kundgol', district: 'Dharwad', state: 'Karnataka', pincode: '581113' },
  { village: 'Byadgi Chili Yard', taluk: 'Byadgi', district: 'Haveri', state: 'Karnataka', pincode: '581106' },
  { village: 'Chikodi Sugar Belt', taluk: 'Chikodi', district: 'Belagavi', state: 'Karnataka', pincode: '591201' },
  { village: 'Bailhongal Fields', taluk: 'Bailhongal', district: 'Belagavi', state: 'Karnataka', pincode: '591102' },
];

export const LocationSelectorModal = ({ visible, onClose }) => {
  const { location, updateLocation, detectGpsLocation, isLocating } = useLocation();
  const { t } = useLanguage();

  const [customVillage, setCustomVillage] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');

  const handleSelectPreset = (item) => {
    updateLocation({ ...item, gpsEnabled: false });
    onClose();
  };

  const handleApplyCustom = () => {
    if (customVillage.trim()) {
      updateLocation({
        village: customVillage.trim(),
        district: customDistrict.trim() || 'Dharwad',
        taluk: customDistrict.trim() || 'Hubballi',
        state: 'Karnataka',
        pincode: '580031',
        gpsEnabled: false,
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetCard}>
          <View style={styles.header}>
            <Text style={styles.title}>📍 Select Your Farm Location</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Your location helps us show nearby machinery, farm delivery availability, and local cooperative rates.
          </Text>

          {/* GPS Auto-Detect Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={async () => {
              await detectGpsLocation();
              onClose();
            }}
            disabled={isLocating}
          >
            <Text style={styles.gpsEmoji}>🎯</Text>
            <View style={styles.gpsTextCol}>
              <Text style={styles.gpsTitle}>Use Current GPS Location</Text>
              <Text style={styles.gpsSubtitle}>
                {isLocating ? 'Detecting farm coordinates...' : 'Accurate within 10 meters'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>OR SELECT POPULAR FARMING REGIONS:</Text>

          <ScrollView style={styles.presetList} showsVerticalScrollIndicator={false}>
            {PRESET_VILLAGES.map((item, idx) => {
              const isSelected = location.village === item.village;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetRow, isSelected && styles.presetRowSelected]}
                  onPress={() => handleSelectPreset(item)}
                >
                  <Text style={styles.presetIcon}>{isSelected ? '✅' : '🏡'}</Text>
                  <View style={styles.presetDetails}>
                    <Text style={[styles.presetVillage, isSelected && styles.presetTextSelected]}>
                      {item.village}
                    </Text>
                    <Text style={styles.presetMeta}>
                      Taluk: {item.taluk} | District: {item.district} ({item.pincode})
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Manual Input */}
          <View style={styles.customBox}>
            <TextInput
              style={styles.input}
              placeholder="Enter your village / town name"
              value={customVillage}
              onChangeText={setCustomVillage}
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustom}>
              <Text style={styles.applyBtnText}>Set Village</Text>
            </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: Spacing.borderRadiusLarge,
    borderTopRightRadius: Spacing.borderRadiusLarge,
    padding: Spacing.l,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
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
  subtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySurface,
    padding: Spacing.m,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1.5,
    borderColor: Colors.primaryBorder,
    marginBottom: 16,
  },
  gpsEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  gpsTextCol: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  gpsSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  presetList: {
    maxHeight: 200,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F7FAF7',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2EBE2',
  },
  presetRowSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  presetIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  presetDetails: {
    flex: 1,
  },
  presetVillage: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  presetTextSelected: {
    color: Colors.primary,
  },
  presetMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  customBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F4F0',
    borderRadius: Spacing.borderRadiusButton,
    paddingHorizontal: 12,
    fontSize: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#D0DDD0',
    color: Colors.textPrimary,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
