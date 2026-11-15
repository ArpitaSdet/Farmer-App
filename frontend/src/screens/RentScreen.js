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
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';
import { submitRentalBooking } from '../services/bookings';
import { useLocation } from '../context/LocationContext';
import { MachineCard } from '../components/MachineCard';
import { BookingModal } from '../components/BookingModal';

const MACHINE_TYPES = [
  { type: 'all', label: 'All Machines', icon: '🚜' },
  { type: 'Tractor', label: 'Tractors', icon: '🚜' },
  { type: 'Harvester', label: 'Harvesters', icon: '🌾' },
  { type: 'Rotavator', label: 'Rotavators', icon: '🔧' },
  { type: 'Seed Drill', label: 'Seed Drills', icon: '🌱' },
  { type: 'Sprayer', label: 'Sprayers', icon: '🌿' },
  { type: 'Cultivator', label: 'Cultivators', icon: '🚜' },
  { type: 'Thresher', label: 'Threshers', icon: '🌾' },
  { type: 'Power Tiller', label: 'Power Tillers', icon: '🚜' },
  { type: 'Plough', label: 'Ploughs', icon: '🔧' },
  { type: 'Trailer', label: 'Trailers', icon: '🛻' },
];

export const RentScreen = ({ routeParams, onNavigateOrders }) => {
  const { t } = useLanguage();
  const { location } = useLocation();

  const [machines, setMachines] = useState([]);
  const [selectedType, setSelectedType] = useState(routeParams?.type || 'all');
  const [searchQuery, setSearchQuery] = useState(routeParams?.search || '');
  const [onlyWithOperator, setOnlyWithOperator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  useEffect(() => {
    if (routeParams?.type) {
      setSelectedType(routeParams.type);
    }
  }, [routeParams]);

  const loadMachines = async () => {
    try {
      const params = {};
      if (selectedType !== 'all') params.type = selectedType;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (onlyWithOperator) params.operatorAvailable = 'true';

      const res = await api.getMachines(params);
      if (res.machines) {
        setMachines(res.machines);
      }
    } catch (e) {
      console.warn('Failed to fetch machines:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, [selectedType, onlyWithOperator]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMachines();
  };

  // Availability changes (owner toggles, new machines) refresh the list live
  useRealtime('machine:updated', () => loadMachines());

  const handleBookingConfirm = async (bookingData) => {
    const message = await submitRentalBooking(bookingData, location);
    alert(message);
    if (onNavigateOrders) onNavigateOrders('rentals');
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚜 Rent Farm Machinery</Text>
        <Text style={styles.headerSubtitle}>
          Save money. Rent verified tractors & harvesters near you.
        </Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tractor model, horsepower, location..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadMachines}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Machine Type Filter Bar */}
      <View style={styles.typeBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeScroll}
        >
          {MACHINE_TYPES.map((item) => {
            const isSelected = selectedType.toLowerCase() === item.type.toLowerCase();
            return (
              <TouchableOpacity
                key={item.type}
                style={[styles.typePill, isSelected && styles.typePillActive]}
                onPress={() => setSelectedType(item.type)}
              >
                <Text style={styles.typeEmoji}>{item.icon}</Text>
                <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Row: Operator Toggle & Count */}
      <View style={styles.filterRow}>
        <Text style={styles.countText}>
          {machines.length} Machines Available in Dharwad/Hubballi
        </Text>
        <TouchableOpacity
          style={[styles.operatorFilter, onlyWithOperator && styles.operatorFilterActive]}
          onPress={() => setOnlyWithOperator((prev) => !prev)}
        >
          <Text
            style={[styles.operatorText, onlyWithOperator && styles.operatorTextActive]}
          >
            {onlyWithOperator ? '✓ Driver Only' : '+ Driver Available'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Machinery List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.earth} />
          <Text style={styles.loadingText}>Locating available farm machines...</Text>
        </View>
      ) : machines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🚜</Text>
          <Text style={styles.emptyTitle}>No machinery found</Text>
          <Text style={styles.emptySub}>
            Try changing the machine type or search query
          </Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSelectedType('all');
              setSearchQuery('');
              setOnlyWithOperator(false);
              loadMachines();
            }}
          >
            <Text style={styles.resetBtnText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.earth]} />
          }
        >
          {machines.map((m) => (
            <MachineCard
              key={m.id}
              machine={m}
              onViewDetails={() => setSelectedMachine(m)}
              onRentNow={() => setSelectedMachine(m)}
              onCallOwner={() =>
                alert(`Calling Owner: ${m.ownerName} (${m.ownerPhone})`)
              }
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Multi-step Booking Modal */}
      <BookingModal
        visible={!!selectedMachine}
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        onConfirmBooking={handleBookingConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.earth,
    paddingHorizontal: Spacing.l,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#D7CCC8',
    marginTop: 2,
    marginBottom: 12,
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
  typeBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EFEBE9',
    paddingVertical: 10,
  },
  typeScroll: {
    paddingHorizontal: Spacing.l,
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Spacing.borderRadiusPill,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
  },
  typePillActive: {
    backgroundColor: '#EFEBE9',
    borderColor: Colors.earth,
  },
  typeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  typeLabelActive: {
    color: Colors.earth,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    flex: 1,
  },
  operatorFilter: {
    backgroundColor: '#EFEBE9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D7CCC8',
  },
  operatorFilterActive: {
    backgroundColor: Colors.earth,
    borderColor: Colors.earth,
  },
  operatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.earth,
  },
  operatorTextActive: {
    color: '#FFFFFF',
  },
  list: {
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
    fontSize: 52,
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
    backgroundColor: Colors.earth,
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
