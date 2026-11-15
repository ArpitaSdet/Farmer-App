import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { Typography } from '../theme/typography';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';
import { submitRentalBooking } from '../services/bookings';
import { useLocation } from '../context/LocationContext';

import { Header } from '../components/Header';
import { SearchBarWithVoice } from '../components/SearchBarWithVoice';
import { LocationSelectorModal } from '../components/LocationSelectorModal';
import { LanguageSelectorModal } from '../components/LanguageSelectorModal';
import { BannerCarousel } from '../components/BannerCarousel';
import { QuickActions } from '../components/QuickActions';
import { CategoryGrid } from '../components/CategoryGrid';
import { ProductCard } from '../components/ProductCard';
import { MachineCard } from '../components/MachineCard';
import { FarmerBenefits } from '../components/FarmerBenefits';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { BookingModal } from '../components/BookingModal';
import { OfflineBanner } from '../components/OfflineBanner';

const DEFAULT_BANNERS = [
  {
    id: 'b1',
    title: 'Govt. Subsidized DAP & Urea Sacks',
    subtitle: '100% genuine neem-coated fertilizer delivered directly to your farm gate.',
    badge: 'GOVT. SUBSIDY',
    ctaText: 'Shop Fertilizers',
    bgColor: '#1B5E20',
    targetScreen: 'Shop',
    category: 'fertilizers',
  },
  {
    id: 'b2',
    title: 'Pre-Book Paddy & Wheat Harvester',
    subtitle: 'Rubber crawler harvesters with trained operators. Avoid monsoon crop loss.',
    badge: 'HARVEST SEASON',
    ctaText: 'Rent Harvester',
    bgColor: '#E65100',
    targetScreen: 'Rent',
    category: 'Harvester',
  },
  {
    id: 'b3',
    title: 'High-Yield Hybrid Cotton & Gram Seeds',
    subtitle: 'Certified germination >95% from registered agricultural cooperatives.',
    badge: 'RABI SPECIAL',
    ctaText: 'Explore Seeds',
    bgColor: '#2E7D32',
    targetScreen: 'Shop',
    category: 'seeds',
  },
];

export const HomeScreen = ({
  onNavigateTab,
  onOpenNotifications,
  unreadCount = 0,
}) => {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { location } = useLocation();

  // Data States
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState(DEFAULT_BANNERS);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [cropRecommendations, setCropRecommendations] = useState([]);
  const [nearbyMachines, setNearbyMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);

  const loadHomeData = async () => {
    try {
      setIsOffline(false);
      const feed = await api.getHomeFeed();
      if (feed.banners.length) {
        const colors = ['#1B5E20', '#E65100', '#2E7D32', '#5D4037'];
        setBanners(
          feed.banners.map((b, i) => ({
            ...b,
            badge: b.targetScreen === 'Rent' ? 'MACHINERY' : 'OFFER',
            ctaText: b.targetScreen === 'Rent' ? 'Rent Now' : 'Shop Now',
            bgColor: colors[i % colors.length],
          }))
        );
      }
      setCategories([...feed.categories, { id: 'machinery', slug: 'machinery', name: 'Rent Machines', icon: '🚜' }]);
      setFeaturedProducts(feed.products);
      setNearbyMachines(feed.machines);
      const crops = (user?.mainCrops || []).map((c) => c.toLowerCase());
      setCropRecommendations(
        feed.products.filter((p) => p.suitableCrops.some((c) => crops.includes(c.toLowerCase())))
      );
    } catch (err) {
      console.warn('Home fetch failed:', err.message);
      setIsOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Live stock & machine availability
  useRealtime(['stock:updated', 'machine:updated', 'catalog:changed'], (payload, event) => {
    if (event === 'stock:updated') {
      const patch = (list) =>
        list.map((p) => (p.variantId === payload.variantId ? { ...p, stock: payload.stock, inStock: payload.stock > 0 } : p));
      setFeaturedProducts(patch);
      setCropRecommendations(patch);
    } else {
      loadHomeData();
    }
  });

  useEffect(() => {
    loadHomeData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onNavigateTab('Shop', { search: searchQuery });
    }
  };

  const handleBannerPress = (banner) => {
    if (banner.targetScreen === 'Rent') {
      onNavigateTab('Rent', { type: banner.category || 'Tractor' });
    } else {
      onNavigateTab('Shop', { category: banner.category || 'fertilizers' });
    }
  };

  const handleCategoryPress = (categorySlug) => {
    if (categorySlug === 'machinery') {
      onNavigateTab('Rent');
    } else {
      onNavigateTab('Shop', { category: categorySlug });
    }
  };

  const handleBuyNow = async (product) => {
    if (await addToCart(product, 1)) onNavigateTab('Shop', { openCart: true });
  };

  const handleRentalBookingConfirm = async (bookingData) => {
    const message = await submitRentalBooking(bookingData, location);
    alert(message);
    onNavigateTab('Orders', { tab: 'rentals' });
  };


  return (
    <View style={styles.screen}>
      <OfflineBanner visible={isOffline} onRetry={loadHomeData} />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* 1. Header with Farmer greeting & location */}
        <Header
          onOpenLocation={() => setLocationModalVisible(true)}
          onOpenLanguage={() => setLanguageModalVisible(true)}
          onOpenNotifications={onOpenNotifications}
          unreadCount={unreadCount}
        />

        {/* 2. Text Search Bar */}
        <SearchBarWithVoice
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          onSubmitSearch={handleSearchSubmit}
        />

        {/* 3. Single Verified Promotional Surface: BannerCarousel */}
        <BannerCarousel
          banners={banners}
          onBannerPress={handleBannerPress}
        />

        {/* TODO [Phase 6 - Mandi & Weather]: Fetch live APMC mandi prices from Agmarknet API and render ticker */}
        <View style={{ marginHorizontal: Spacing.l, marginVertical: 6, padding: 10, backgroundColor: '#FFFDE7', borderRadius: 8, borderWidth: 1, borderColor: '#FFF59D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>🌤️</Text>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F57F17' }}>Hubballi APMC Mandi & Weather</Text>
              <Text style={{ fontSize: 11, color: '#795548' }}>Cotton: ₹7,450/qtl • Bengal Gram: ₹6,100/qtl (Clear Sky)</Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#9E9D24', backgroundColor: '#FFF9C4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>LIVE</Text>
        </View>

        {/* 4. Quick Actions (Buy Inputs vs Rent Machines) */}
        <QuickActions
          onSelectCategory={(slug) => onNavigateTab('Shop', { category: slug })}
          onNavigateShop={() => onNavigateTab('Shop')}
          onNavigateRent={(type) => onNavigateTab('Rent', { type })}
        />

        {/* 5. Agricultural Categories Grid */}
        <CategoryGrid categories={categories} onSelectCategory={handleCategoryPress} />

        {/* 5B. Recommended for Farmer's Specific Crops */}
        {cropRecommendations && cropRecommendations.length > 0 && (
          <View style={styles.cropSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>🌾 Recommended for Your Crops</Text>
                <Text style={styles.sectionSubtitle}>
                  Specially matched for {(user?.mainCrops || ['Cotton', 'Paddy', 'Bengal Gram']).join(', ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onNavigateTab('Shop')}>
                <Text style={styles.seeAllText}>Explore →</Text>
              </TouchableOpacity>
            </View>

            {/* Crop Filter Badges */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropPillRow}>
              {(user?.mainCrops || ['Cotton', 'Paddy', 'Bengal Gram']).map((crop, idx) => (
                <View key={idx} style={styles.cropPill}>
                  <Text style={styles.cropPillEmoji}>🌱</Text>
                  <Text style={styles.cropPillText}>{crop} Care</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.productsList}>
              {cropRecommendations.slice(0, 3).map((p) => (
                <ProductCard
                  key={`rec_${p.id}`}
                  product={p}
                  onPress={() => setSelectedProduct(p)}
                  onAddToCart={(prod) => {
                    addToCart(prod, 1);
                    alert(`Added ${prod.name} to Cart!`);
                  }}
                  onBuyNow={handleBuyNow}
                />
              ))}
            </View>
          </View>
        )}

        {/* 6. Popular Farming Inputs */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>🌱 Certified Farm Inputs</Text>
            <Text style={styles.sectionSubtitle}>Subsidized seeds, fertilizer sacks & spray pumps</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateTab('Shop')}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.productsList}>
          {featuredProducts.slice(0, 4).map((p) => (
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
        </View>

        {/* 7. Farm Machinery Rental Near You */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>🚜 {t('machinesNearYou')}</Text>
            <Text style={styles.sectionSubtitle}>Verified tractors & harvesters within your district</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateTab('Rent')}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.machinesList}>
          {nearbyMachines.slice(0, 3).map((m) => (
            <MachineCard
              key={m.id}
              machine={m}
              onViewDetails={() => setSelectedMachine(m)}
              onRentNow={() => setSelectedMachine(m)}
              onCallOwner={() => alert(`Calling Owner ${m.ownerName}: ${m.ownerPhone}`)}
            />
          ))}
        </View>

        {/* 8. Farmer Trust Factors */}
        <FarmerBenefits />

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Location Selector Modal */}
      <LocationSelectorModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

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

      {/* Machine Booking Modal */}
      <BookingModal
        visible={!!selectedMachine}
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        onConfirmBooking={handleRentalBookingConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    marginTop: 18,
    marginBottom: 10,
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
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  productsList: {
    paddingHorizontal: Spacing.l,
  },
  machinesList: {
    paddingHorizontal: Spacing.l,
  },
  cropSection: {
    backgroundColor: '#F1F8E9',
    paddingVertical: 12,
    marginVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DCEDC8',
  },
  cropPillRow: {
    paddingHorizontal: Spacing.l,
    paddingVertical: 8,
    gap: 8,
  },
  cropPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginRight: 8,
  },
  cropPillEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  cropPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
