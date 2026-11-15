import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

export const MachineCard = ({ machine, onViewDetails, onRentNow, onCallOwner }) => {
  const { t } = useLanguage();

  return (
    <View style={styles.card}>
      {/* Machine Image with Horsepower & Distance Badge */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: machine.image }} style={styles.image} resizeMode="cover" />
        
        {/* Horsepower Badge */}
        {!!machine.horsepower && (
          <View style={styles.hpBadge}>
            <Text style={styles.hpText}>⚡ {machine.horsepower}</Text>
          </View>
        )}

        {/* Distance Badge */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>📍 {machine.distanceKm || '4.5'} km away</Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingBadge}>
          <Text style={styles.starText}>⭐</Text>
          <Text style={styles.ratingText}>{machine.rating ? `${machine.rating}` : 'New'}</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.typeBadgeText}>🚜 {machine.type}</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {machine.name}
            </Text>
            <Text style={styles.locationText}>
              🏡 {machine.village && machine.district ? `${machine.village}, ${machine.district}` : machine.location || machine.district}
            </Text>
          </View>
        </View>

        {/* Feature Badges: Operator & Delivery */}
        <View style={styles.featurePillsRow}>
          <View style={styles.pillFeature}>
            <Text style={styles.pillFeatureText}>
              {machine.operatorAvailable ? '👨‍🌾 Driver Available' : 'No Driver'}
            </Text>
          </View>
          <View style={styles.pillFeature}>
            <Text style={styles.pillFeatureText}>🚚 Farm Delivery</Text>
          </View>
        </View>

        {/* Price Rates (Hour & Day) */}
        <View style={styles.ratesContainer}>
          <View style={styles.rateCol}>
            <Text style={styles.rateLabel}>Hourly Rate</Text>
            <Text style={styles.rateValue}>
              ₹{machine.hourlyRate}
              <Text style={styles.perUnit}>{t('hourlyRate')}</Text>
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rateCol}>
            <Text style={styles.rateLabel}>Full Day Rate</Text>
            <Text style={styles.rateValue}>
              ₹{machine.dailyRate}
              <Text style={styles.perUnit}>{t('dailyRate')}</Text>
            </Text>
          </View>
        </View>

        {/* Action Buttons: View Details & Rent Now */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => onViewDetails(machine)}
            activeOpacity={0.8}
            accessibilityLabel="View Machine Details"
          >
            <Text style={styles.detailsText}>{t('viewDetails')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rentButton}
            onPress={() => onRentNow(machine)}
            activeOpacity={0.8}
            accessibilityLabel="Rent Farm Machine Now"
          >
            <Text style={styles.rentText}>{t('rentNow')} →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 175,
    backgroundColor: '#EFEBE9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hpBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.earth,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hpText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  starText: {
    fontSize: 10,
    marginRight: 3,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  infoContainer: {
    padding: 14,
  },
  titleRow: {
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.earthMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  nameText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  featurePillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 8,
  },
  pillFeature: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  pillFeatureText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.earth,
  },
  ratesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2EAE2',
  },
  rateCol: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#D0DCD0',
  },
  rateLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.earth,
    marginTop: 2,
  },
  perUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    height: 46,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
  },
  detailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rentButton: {
    flex: 1.4,
    backgroundColor: Colors.earth,
    height: 46,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  rentText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
