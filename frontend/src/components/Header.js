import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';

export const Header = ({ onOpenLocation, onOpenLanguage, onOpenNotifications, unreadCount = 0 }) => {
  const { t, currentLanguage } = useLanguage();
  const { location } = useLocation();
  const { user, isAdminMode, switchRole } = useAuth();

  // Determine time of day greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('greetingMorning')
      : hour < 17
      ? t('greetingAfternoon')
      : t('greetingEvening');

  return (
    <View style={styles.container}>
      {/* Top Bar: Brand, Greeting, Badges */}
      <View style={styles.topRow}>
        <View style={styles.farmerInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{isAdminMode ? '🛠️' : '👨‍🌾'}</Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.farmerName}>{user ? user.name : 'Kisan Mitra'}</Text>
          </View>
        </View>

        {/* Right Action Icons: Language Pill & Notification Bell */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.langPill}
            onPress={onOpenLanguage}
            accessibilityLabel="Change Language"
          >
            <Text style={styles.langEmoji}>🌐</Text>
            <Text style={styles.langText}>{currentLanguage.toUpperCase()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifButton}
            onPress={onOpenNotifications}
            accessibilityLabel="Notifications"
          >
            <Text style={styles.notifEmoji}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badgeCircle}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          
        </View>
      </View>

      {/* Location Bar with quick change button */}
      <TouchableOpacity
        style={styles.locationBar}
        onPress={onOpenLocation}
        activeOpacity={0.8}
        accessibilityLabel="Select village location"
      >
        <View style={styles.locationLeft}>
          <Text style={styles.pinEmoji}>📍</Text>
          <Text style={styles.locationLabel}>{t('yourLocation')}:</Text>
          <Text style={styles.locationVillage} numberOfLines={1}>
            {location.village}, {location.taluk || location.district}
          </Text>
        </View>
        <View style={styles.changeBadge}>
          <Text style={styles.changeText}>{t('changeLocation')} ▼</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: Spacing.l,
    borderBottomLeftRadius: Spacing.borderRadiusLarge,
    borderBottomRightRadius: Spacing.borderRadiusLarge,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  farmerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#81C784',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  nameBlock: {
    justifyContent: 'center',
  },
  greetingText: {
    color: '#C8E6C9',
    fontSize: 12,
    fontWeight: '600',
  },
  farmerName: {
    color: Colors.textWhite,
    fontSize: 17,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Spacing.borderRadiusPill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  langEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  langText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  notifButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifEmoji: {
    fontSize: 18,
  },
  badgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.harvestYellow,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  roleSwitchButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  roleSwitchActive: {
    backgroundColor: Colors.harvestGold,
    borderColor: '#FFF',
  },
  roleSwitchText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinEmoji: {
    fontSize: 15,
    marginRight: 6,
  },
  locationLabel: {
    color: '#C8E6C9',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 6,
  },
  locationVillage: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  changeBadge: {
    paddingLeft: 8,
  },
  changeText: {
    color: Colors.harvestYellow,
    fontSize: 11,
    fontWeight: '700',
  },
});
