import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = Math.min(SCREEN_WIDTH - 32, 600);

export const BannerCarousel = ({ banners = [], onBannerPress }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[activeIndex] || banners[0];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bannerCard,
          { backgroundColor: currentBanner.bgColor || Colors.primary },
        ]}
      >
        {(currentBanner.imageUrl || currentBanner.image) ? (
          <Image
            source={{ uri: currentBanner.imageUrl || currentBanner.image }}
            style={styles.bannerBackground}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.gradientOverlay} />

        <View style={styles.contentCol}>
          {currentBanner.badge ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{currentBanner.badge}</Text>
            </View>
          ) : null}

          <Text style={styles.bannerTitle} numberOfLines={2}>
            {currentBanner.title}
          </Text>

          <Text style={styles.bannerSubtitle} numberOfLines={2}>
            {currentBanner.subtitle}
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => onBannerPress(currentBanner)}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{currentBanner.ctaText} →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pagination Indicator Dots */}
      {banners.length > 1 && (
        <View style={styles.paginationRow}>
          {banners.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dot,
                activeIndex === idx ? styles.dotActive : styles.dotInactive,
              ]}
              onPress={() => setActiveIndex(idx)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.l,
    marginVertical: 10,
    alignItems: 'center',
  },
  bannerCard: {
    width: '100%',
    maxWidth: 600,
    height: 190,
    borderRadius: Spacing.borderRadiusLarge,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 30, 10, 0.45)',
  },
  contentCol: {
    padding: Spacing.l,
    maxWidth: '85%',
    zIndex: 2,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.harvestYellow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    lineHeight: 24,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E0E8E0',
    lineHeight: 18,
    marginBottom: 14,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.harvestGold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Spacing.borderRadiusButton,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  ctaText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#C8D6C8',
  },
});
