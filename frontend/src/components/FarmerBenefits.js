import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

export const FarmerBenefits = () => {
  const { t } = useLanguage();

  const benefits = [
    { emoji: '🌱', title: t('benefit1Title'), desc: t('benefit1Desc') },
    { emoji: '🚜', title: t('benefit2Title'), desc: t('benefit2Desc') },
    { emoji: '📍', title: t('benefit3Title'), desc: t('benefit3Desc') },
    { emoji: '💰', title: t('benefit4Title'), desc: t('benefit4Desc') },
    { emoji: '🚚', title: t('benefit5Title'), desc: t('benefit5Desc') },
    { emoji: '📞', title: t('benefit6Title'), desc: t('benefit6Desc') },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🏆 {t('whyFarmersUse')}</Text>
      <Text style={styles.sectionSubtitle}>Designed specifically for Indian farmers and field needs</Text>

      <View style={styles.grid}>
        {benefits.map((b, idx) => (
          <View key={idx} style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.emoji}>{b.emoji}</Text>
            </View>
            <Text style={styles.cardTitle}>{b.title}</Text>
            <Text style={styles.cardDesc}>{b.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.l,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadiusCard,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E0EAE0',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
});
