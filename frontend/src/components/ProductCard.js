import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

export const ProductCard = ({ product, onPress, onAddToCart, onBuyNow }) => {
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(product)}
      activeOpacity={0.9}
    >
      {/* Product Image & Badges */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.image }}
          style={styles.image}
          resizeMode="cover"
        />
        {product.discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discountPercentage}% OFF</Text>
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Text style={styles.starText}>⭐</Text>
          <Text style={styles.ratingText}>{product.rating || '4.8'}</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.brandText}>{product.brand || 'Verified Agri-Brand'}</Text>
        <Text style={styles.nameText} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.packText}>📦 {product.packSize || '1 Unit'}</Text>

        {/* Pricing */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{product.price}</Text>
          {product.mrp && product.mrp > product.price && (
            <Text style={styles.mrp}>₹{product.mrp}</Text>
          )}
        </View>

        {/* Stock status */}
        <Text style={product.stock > 0 ? styles.inStock : styles.outOfStock}>
          {product.stock > 0 ? `✓ In Stock (${product.stock} available)` : 'Out of Stock'}
        </Text>

        {/* Dual Actions: Add to Cart and Buy Now */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => onAddToCart(product)}
            activeOpacity={0.8}
            accessibilityLabel="Add to Cart"
          >
            <Text style={styles.cartButtonText}>+ Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => onBuyNow(product)}
            activeOpacity={0.8}
            accessibilityLabel="Buy Now"
          >
            <Text style={styles.buyButtonText}>{t('buyNow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardSurface,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#D8E2D8',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 155,
    backgroundColor: '#F0F4F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
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
    padding: 12,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
    lineHeight: 19,
    minHeight: 38,
  },
  packText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  mrp: {
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  inStock: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 4,
  },
  outOfStock: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.danger,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cartButton: {
    flex: 1,
    backgroundColor: Colors.primarySurface,
    height: 42,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#A5D6A7',
  },
  cartButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  buyButton: {
    flex: 1.2,
    backgroundColor: Colors.primary,
    height: 42,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
