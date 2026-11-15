import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';

import { HomeScreen } from '../screens/HomeScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { RentScreen } from '../screens/RentScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CartScreen } from '../screens/CartScreen';

export const BottomNavigator = () => {
  const { t } = useLanguage();
  const { cartCount } = useCart();

  const [activeTab, setActiveTab] = useState('Home'); // Home, Shop, Rent, Orders, Profile
  const [shopRouteParams, setShopRouteParams] = useState(null);
  const [rentRouteParams, setRentRouteParams] = useState(null);
  const [ordersInitialTab, setOrdersInitialTab] = useState('products');

  const [cartVisible, setCartVisible] = useState(false);
    const [notifVisible, setNotifVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (e) {
      console.warn('Notifications unavailable:', e.message);
    }
  };

  const [toast, setToast] = useState(null);

  // New alerts arrive instantly over the socket; show a banner for a few seconds
  useRealtime('notification:new', (n) => {
    setNotifications((prev) => [n, ...prev]);
    setToast(n);
    setTimeout(() => setToast((cur) => (cur?.id === n.id ? null : cur)), 5000);
  });

  const openNotifications = () => {
    setNotifVisible(true);
    if (notifications.some((n) => !n.isRead)) {
      api.markAllNotificationsRead().catch(() => undefined);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleNavigateTab = (tabName, params = {}) => {
    if (params.openCart) {
      setCartVisible(true);
      return;
    }
    if (tabName === 'Shop') {
      setShopRouteParams(params);
    }
    if (tabName === 'Rent') {
      setRentRouteParams(params);
    }
    if (tabName === 'Orders') {
      setOrdersInitialTab(params.tab || 'products');
    }
    setActiveTab(tabName);
  };

  const navItems = [
    { key: 'Home', label: t('navHome'), emoji: '🏠' },
    { key: 'Shop', label: t('navShop'), emoji: '🛒' },
    { key: 'Rent', label: t('navRent'), emoji: '🚜' },
    { key: 'Orders', label: t('navOrders'), emoji: '📦' },
    { key: 'Profile', label: t('navProfile'), emoji: '👤' },
  ];

  return (
    <View style={styles.container}>
      {/* Active Screen Rendering */}
      <View style={styles.screenContainer}>
        {activeTab === 'Home' && (
          <HomeScreen
            onNavigateTab={handleNavigateTab}
            onOpenNotifications={openNotifications}
            unreadCount={notifications.filter((n) => !n.isRead).length}
          />
        )}
        {activeTab === 'Shop' && (
          <ShopScreen
            routeParams={shopRouteParams}
            onOpenCart={() => setCartVisible(true)}
          />
        )}
        {activeTab === 'Rent' && (
          <RentScreen
            routeParams={rentRouteParams}
            onNavigateOrders={(tab) => handleNavigateTab('Orders', { tab })}
          />
        )}
        {activeTab === 'Orders' && (
          <OrdersScreen initialTab={ordersInitialTab} />
        )}
        {activeTab === 'Profile' && (
          <ProfileScreen
            onNavigateOrders={(tab) => handleNavigateTab('Orders', { tab })}
            
          />
        )}
      </View>

      {/* Floating Farmer Cart Quick Access Bar */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => setCartVisible(true)}
          activeOpacity={0.9}
        >
          <View style={styles.floatingCartLeft}>
            <Text style={styles.cartEmoji}>🛒</Text>
            <View>
              <Text style={styles.floatingCartTitle}>
                {cartCount} {cartCount === 1 ? 'Farm Item' : 'Farm Items'} in Cart
              </Text>
              <Text style={styles.floatingCartSub}>Tap to Review & Checkout</Text>
            </View>
          </View>
          <View style={styles.viewCartBadge}>
            <Text style={styles.viewCartText}>View Cart →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 5-Item Large Touch Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navButton, isActive && styles.navButtonActive]}
              onPress={() => {
                if (item.key === 'Shop') setShopRouteParams(null);
                if (item.key === 'Rent') setRentRouteParams(null);
                setActiveTab(item.key);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Text style={[styles.navEmoji, isActive && styles.navEmojiActive]}>
                  {item.emoji}
                </Text>
                {item.key === 'Shop' && cartCount > 0 && (
                  <View style={styles.cartBadgeSmall}>
                    <Text style={styles.cartBadgeSmallText}>{cartCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Cart & Checkout Modal */}
      <CartScreen
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        onOrderPlaced={() => handleNavigateTab('Orders', { tab: 'products' })}
        onContinueShopping={() => {
          setCartVisible(false);
          setActiveTab('Shop');
        }}
      />

      {toast && (
        <TouchableOpacity style={styles.toast} onPress={openNotifications} activeOpacity={0.9}>
          <Text style={styles.toastTitle}>🔔 {toast.title}</Text>
          <Text style={styles.toastBody} numberOfLines={2}>{toast.body}</Text>
        </TouchableOpacity>
      )}

      {/* Notification Center Modal */}
      <Modal visible={notifVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.notifSheet}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>🔔 Farm Alerts & Notifications</Text>
              <TouchableOpacity onPress={() => setNotifVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notifList}>
              {notifications.map((n) => (
                <View key={n.id} style={[styles.notifCard, !n.isRead && { borderLeftWidth: 4, borderLeftColor: Colors.harvestGold }]}>
                  <Text style={styles.notifCardTitle}>{n.title}</Text>
                  <Text style={styles.notifCardBody}>{n.body}</Text>
                  <Text style={styles.notifCardTime}>
                    {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    backgroundColor: Colors.earth,
    borderRadius: 12,
    padding: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 100,
  },
  toastTitle: { color: '#FFE082', fontWeight: '800' },
  toastBody: { color: '#fff', marginTop: 2 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 74,
    left: 16,
    right: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Spacing.borderRadiusButton,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: '#81C784',
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartEmoji: {
    fontSize: 24,
  },
  floatingCartTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  floatingCartSub: {
    color: '#C8E6C9',
    fontSize: 11,
    fontWeight: '600',
  },
  viewCartBadge: {
    backgroundColor: Colors.harvestYellow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewCartText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomNav: {
    height: 68,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderColor: '#D8E2D8',
    paddingHorizontal: 4,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    marginVertical: 4,
  },
  navButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  iconContainer: {
    position: 'relative',
  },
  navEmoji: {
    fontSize: 22,
    opacity: 0.75,
  },
  navEmojiActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  cartBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.danger,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeSmallText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 2,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  notifSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Spacing.borderRadiusLarge,
    borderTopRightRadius: Spacing.borderRadiusLarge,
    padding: Spacing.l,
    maxHeight: '75%',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  notifTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMuted,
    padding: 6,
  },
  notifList: {
    marginBottom: 20,
  },
  notifCard: {
    backgroundColor: '#F8FAF8',
    padding: 12,
    borderRadius: Spacing.borderRadiusCard,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D8E2D8',
  },
  notifCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  notifCardBody: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  notifCardTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 6,
  },
});
