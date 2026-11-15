import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

export const QuickActions = ({ onSelectCategory, onNavigateShop, onNavigateRent }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {/* 2 Massive Hero Action Cards */}
      <View style={styles.heroRow}>
        {/* BUY FARM PRODUCTS */}
        <TouchableOpacity
          style={styles.heroCardShop}
          onPress={onNavigateShop}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircleGreen}>
              <Text style={styles.heroEmoji}>🌱</Text>
            </View>
            <View style={styles.badgeAction}>
              <Text style={styles.badgeActionText}>SHOP</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{t('buyProducts')}</Text>
          <Text style={styles.heroSub}>{t('buyProductsSub')}</Text>

          {/* Quick Shortcuts */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => onSelectCategory('seeds')}
            >
              <Text style={styles.pillText}>🌱 Seeds</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => onSelectCategory('fertilizers')}
            >
              <Text style={styles.pillText}>🧪 Fertilizer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => onSelectCategory('crop_protection')}
            >
              <Text style={styles.pillText}>🌿 Care</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* RENT FARM MACHINE */}
        <TouchableOpacity
          style={styles.heroCardRent}
          onPress={onNavigateRent}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircleBrown}>
              <Text style={styles.heroEmoji}>🚜</Text>
            </View>
            <View style={styles.badgeActionOrange}>
              <Text style={styles.badgeActionText}>RENT</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{t('rentMachinery')}</Text>
          <Text style={styles.heroSub}>{t('rentMachinerySub')}</Text>

          {/* Quick Shortcuts */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              style={styles.pillBrown}
              onPress={() => onNavigateRent('Tractor')}
            >
              <Text style={styles.pillTextBrown}>🚜 Tractor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pillBrown}
              onPress={() => onNavigateRent('Harvester')}
            >
              <Text style={styles.pillTextBrown}>🌾 Harvester</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pillBrown}
              onPress={() => onNavigateRent('Rotavator')}
            >
              <Text style={styles.pillTextBrown}>🔧 Rotavator</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.l,
    marginVertical: 12,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroCardShop: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: Spacing.borderRadiusLarge,
    padding: 14,
    borderWidth: 2,
    borderColor: '#81C784',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroCardRent: {
    flex: 1,
    backgroundColor: '#EFEBE9',
    borderRadius: Spacing.borderRadiusLarge,
    padding: 14,
    borderWidth: 2,
    borderColor: '#BCAAA4',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconCircleGreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBrown: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D7CCC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 24,
  },
  badgeAction: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActionOrange: {
    backgroundColor: Colors.earth,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActionText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
    minHeight: 32,
  },
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  pillBrown: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BCAAA4',
  },
  pillTextBrown: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.earth,
  },
});
