import React from 'react';
import { View, Text, Image, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

import { ProductReviews } from './ProductReviews';
export const ProductDetailModal = ({ visible, product, onClose, onAddToCart, onBuyNow }) => {
  const { t } = useLanguage();
  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {product.brand || 'Agri Product'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {/* Main Large Product Image */}
          <View style={styles.imageBox}>
            <Image source={{ uri: product.image }} style={styles.image} resizeMode="contain" />
            {product.discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discountPercentage}% OFF</Text>
              </View>
            )}
          </View>

          {/* Core Info */}
          <View style={styles.content}>
            <Text style={styles.brand}>{product.brand}</Text>
            <Text style={styles.title}>{product.name}</Text>

            {/* Pack Size & Rating */}
            <View style={styles.metaRow}>
              <View style={styles.packPill}>
                <Text style={styles.packText}>📦 {product.packSize || 'Standard Pack'}</Text>
              </View>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingText}>⭐ {product.rating ? `${product.rating} (${product.reviewCount || 0} reviews)` : 'New'}</Text>
              </View>
            </View>

            {/* Price Box */}
            <View style={styles.priceCard}>
              <View>
                <Text style={styles.priceLabel}>Farmer Direct Price</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{product.price}</Text>
                  {product.mrp && <Text style={styles.mrp}>₹{product.mrp}</Text>}
                </View>
              </View>
              <View style={styles.stockBadge}>
                <Text style={styles.stockText}>✓ {product.stock || 50} bags available</Text>
              </View>
            </View>

            {/* Delivery Guarantee */}
            <View style={styles.deliveryBanner}>
              <Text style={styles.deliveryIcon}>🚚</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveryTitle}>Farm Doorstep Delivery</Text>
                <Text style={styles.deliveryDesc}>
                  {product.deliveryTime || 'Delivered within 2-3 days directly to your farm gate.'}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.sectionHeader}>Product Overview</Text>
            <Text style={styles.description}>{product.description}</Text>

            {/* Suitable Crops */}
            {product.suitableCrops && product.suitableCrops.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>🌾 Recommended Crops</Text>
                <View style={styles.cropsRow}>
                  {product.suitableCrops.map((c, i) => (
                    <View key={i} style={styles.cropPill}>
                      <Text style={styles.cropText}>🌱 {c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Dosage & Usage */}
            {product.dosage && (
              <View style={styles.guideCard}>
                <Text style={styles.guideTitle}>🧪 Recommended Dosage</Text>
                <Text style={styles.guideContent}>{product.dosage}</Text>
                {product.usageInstructions && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.guideSubTitle}>How to Apply:</Text>
                    <Text style={styles.guideContent}>{product.usageInstructions}</Text>
                  </View>
                )}
              </View>
            )}

            <ProductReviews productId={product.id} />
          </View>
        </ScrollView>

        {/* Bottom Dual Sticky Action Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => {
              onAddToCart(product);
              onClose();
            }}
          >
            <Text style={styles.cartBtnText}>+ {t('addToCart')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => {
              onBuyNow(product);
              onClose();
            }}
          >
            <Text style={styles.buyBtnText}>{t('buyNow')} →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    borderBottomWidth: 1,
    borderColor: '#E2EBE2',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scrollArea: {
    flex: 1,
  },
  imageBox: {
    width: '100%',
    height: 260,
    backgroundColor: '#F5FAF5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '90%',
    height: '90%',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    padding: Spacing.l,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primaryMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  packPill: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  packText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.earth,
  },
  ratingPill: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.harvest,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
    marginVertical: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.primaryMedium,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 2,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
  },
  mrp: {
    fontSize: 15,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  deliveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: Spacing.borderRadiusButton,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deliveryIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  deliveryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  deliveryDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionBlock: {
    marginTop: 10,
  },
  cropsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  cropPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  cropText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  guideCard: {
    backgroundColor: '#FFFDE7',
    padding: 14,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1,
    borderColor: '#FFF59D',
    marginTop: 14,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F57F17',
    marginBottom: 4,
  },
  guideSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  guideContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.l,
    borderTopWidth: 1,
    borderColor: '#E2EAE2',
    backgroundColor: '#FFFFFF',
  },
  cartBtn: {
    flex: 1,
    backgroundColor: Colors.primarySurface,
    height: 50,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
  },
  cartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  buyBtn: {
    flex: 1.4,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
