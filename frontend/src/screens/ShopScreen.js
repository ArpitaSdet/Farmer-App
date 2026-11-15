import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from '../components/ProductDetailModal';

const CATEGORIES = [
  { slug: 'all', label: 'All Products', icon: '🌾' },
  { slug: 'seeds', label: 'Seeds', icon: '🌱' },
  { slug: 'fertilizers', label: 'Fertilizers', icon: '🧪' },
  { slug: 'crop-protection', label: 'Crop Care', icon: '🌿' },
  { slug: 'irrigation', label: 'Irrigation', icon: '💧' },
  { slug: 'sprayers', label: 'Sprayers', icon: '🚿' },
  { slug: 'tools', label: 'Tools', icon: '🛠' },
  { slug: 'animal-feed', label: 'Animal Feed', icon: '🐄' },
];

const CROPS = ['All Crops', 'Tomato', 'Cotton', 'Paddy', 'Chilli', 'Vegetables'];

export const ShopScreen = ({ routeParams, onOpenCart }) => {
  const { t } = useLanguage();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    routeParams?.category || 'all'
  );
  const [selectedCrop, setSelectedCrop] = useState('All Crops');
  const [searchQuery, setSearchQuery] = useState(routeParams?.search || '');
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (routeParams?.category) {
      setSelectedCategory(routeParams.category);
    }
    if (routeParams?.search) {
      setSearchQuery(routeParams.search);
    }
  }, [routeParams]);

  // Live stock levels pushed from the server whenever anyone orders or admin restocks
  useRealtime(['stock:updated', 'catalog:changed'], (payload, event) => {
    if (event === 'catalog:changed') return loadProducts();
    setProducts((prev) =>
      prev.map((p) =>
        p.variantId === payload.variantId ? { ...p, stock: payload.stock, inStock: payload.stock > 0 } : p
      )
    );
  });

  const loadProducts = async () => {
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedCrop !== 'All Crops') params.crop = selectedCrop;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy) params.sort = sortBy;

      const res = await api.getProducts(params);
      if (res.products) {
        setProducts(res.products);
      }
    } catch (e) {
      console.warn('Failed to fetch products:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedCrop, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleBuyNow = (product) => {
    addToCart(product, 1);
    if (onOpenCart) onOpenCart();
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search farm inputs by name, brand, crop..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadProducts}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat.slug}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.slug)}
              >
                <Text style={styles.catEmoji}>{cat.icon}</Text>
                <Text style={[styles.catLabel, isSelected && styles.catLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Crop Filter Bar */}
      <View style={styles.cropBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropScroll}>
          {CROPS.map((crop, idx) => {
            const isSelected = selectedCrop === crop;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.cropPill, isSelected && styles.cropPillActive]}
                onPress={() => setSelectedCrop(crop)}
              >
                <Text style={[styles.cropText, isSelected && styles.cropTextActive]}>
                  {crop}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header with Sorting */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          Showing {products.length} farm items
        </Text>
        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'popular' && styles.sortBtnActive]}
            onPress={() => setSortBy('popular')}
          >
            <Text style={[styles.sortText, sortBy === 'popular' && styles.sortTextActive]}>Popular</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'price_asc' && styles.sortBtnActive]}
            onPress={() => setSortBy('price_asc')}
          >
            <Text style={[styles.sortText, sortBy === 'price_asc' && styles.sortTextActive]}>Price: Low</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading certified farm inputs...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🌾</Text>
          <Text style={styles.emptyTitle}>No matching products found</Text>
          <Text style={styles.emptySub}>
            Try changing your category or search keywords
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSelectedCategory('all');
              setSelectedCrop('All Crops');
              setSearchQuery('');
              loadProducts();
            }}
          >
            <Text style={styles.resetBtnText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.productList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        >
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onPress={() => setSelectedProduct(p)}
              onAddToCart={(prod) => {
                addToCart(prod, 1);
                alert(`Added ${prod.name} to Cart!`);
              }}
              onBuyNow={handleBuyNow}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        visible={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p) => {
          addToCart(p, 1);
          alert(`Added ${p.name} to Cart!`);
        }}
        onBuyNow={handleBuyNow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.l,
    paddingTop: 12,
    paddingBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.borderRadiusButton,
    height: 48,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  categoryBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2EBE2',
    paddingVertical: 10,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.l,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Spacing.borderRadiusPill,
    borderWidth: 1.5,
    borderColor: '#D8E2D8',
  },
  categoryPillActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  catEmoji: {
    fontSize: 15,
    marginRight: 6,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  catLabelActive: {
    color: Colors.primary,
  },
  cropBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#EFEFEF',
  },
  cropScroll: {
    paddingHorizontal: Spacing.l,
    gap: 6,
  },
  cropPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F0F4F0',
  },
  cropPillActive: {
    backgroundColor: Colors.primary,
  },
  cropText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cropTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EAEAEA',
  },
  sortBtnActive: {
    backgroundColor: Colors.primary,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sortTextActive: {
    color: '#FFFFFF',
  },
  productList: {
    flex: 1,
    paddingHorizontal: Spacing.l,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Spacing.borderRadiusButton,
  },
  resetBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
