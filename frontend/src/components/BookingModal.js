import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';
import { LiveMap } from './LiveMap';

export const BookingModal = ({ visible, machine, onClose, onConfirmBooking }) => {
  const { t } = useLanguage();
  const { location, detectGpsLocation, isLocating } = useLocation();

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState(1); // day offset from today
  const [selectedTime, setSelectedTime] = useState(7); // hour of day
  const [durationMode, setDurationMode] = useState('HOURS'); // HOURS or DAYS
  const [durationValue, setDurationValue] = useState(4); // 4 hours or 1 day
  const [withOperator, setWithOperator] = useState(true);
  const [withDelivery, setWithDelivery] = useState(true);
  const [farmAddress, setFarmAddress] = useState(
    `${location.village || 'Navalgund'}, Survey No. 42 Farm, ${location.district || 'Dharwad'}`
  );
  const [deliveryCoords, setDeliveryCoords] = useState({
    lat: Number(location?.latitude) || 15.3647,
    lng: Number(location?.longitude) || 75.124,
  });
  const [showPinMap, setShowPinMap] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH_AFTER_WORK'); // CASH_AFTER_WORK or UPI
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (location?.latitude && location?.longitude) {
        setDeliveryCoords({
          lat: Number(location.latitude),
          lng: Number(location.longitude),
        });
      } else {
        detectGpsLocation().then((loc) => {
          if (loc?.latitude && loc?.longitude) {
            setDeliveryCoords({ lat: loc.latitude, lng: loc.longitude });
            if (loc.village) {
              setFarmAddress(`${loc.village}, Survey No. 42 Farm, ${loc.district || location.district || 'Dharwad'}`);
            }
          }
        });
      }
    }
  }, [visible]);

  if (!machine) return null;

  // Real-time Pricing Calculation
  const hourlyRate = machine.hourlyRate || 900;
  const dailyRate = machine.dailyRate || 6500;
  const baseRental =
    durationMode === 'DAYS' ? durationValue * dailyRate : durationValue * hourlyRate;

  const totalHours = durationMode === 'DAYS' ? durationValue * 8 : durationValue;
  const operatorFee =
    withOperator && machine.operatorAvailable
      ? totalHours * (machine.operatorRatePerHour || 150)
      : 0;

  // Mirrors the server quote: flat farm delivery, 18% GST, 20% refundable deposit
  const deliveryFee = withDelivery ? 999 : 0;
  const gst = Math.round((baseRental + operatorFee + deliveryFee) * 0.18);
  const securityDeposit = Math.round(baseRental * 0.2);
  const totalAmount = baseRental + operatorFee + deliveryFee + gst + securityDeposit;

  const start = new Date();
  start.setDate(start.getDate() + selectedDate);
  start.setHours(selectedTime, 0, 0, 0);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmBooking({
        machineId: machine.id,
        machineName: machine.name,
        startDate: start.toISOString(),
        durationHours: durationMode === 'HOURS' ? durationValue : durationValue * 8,
        durationDays: durationMode === 'DAYS' ? durationValue : 0,
        includeOperator: withOperator && machine.operatorAvailable,
        deliveryRequired: withDelivery,
        deliveryAddress: farmAddress,
        deliveryCoords: withDelivery ? deliveryCoords : null,
        pricing: {
          baseRental,
          operatorFee,
          deliveryFee,
          gst,
          securityDeposit,
          totalAmount,
        },
        paymentMethod: paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : 'COD',
      });
      onClose();
    } catch (e) {
      alert(e.message || 'Booking failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dayLabel = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return offset === 0 ? `Today (${date})` : offset === 1 ? `Tomorrow (${date})` : `${d.toLocaleDateString('en-IN', { weekday: 'short' })} (${date})`;
  };
  const DATES = [0, 1, 2, 3, 5, 7].map((o) => ({ value: o, label: dayLabel(o) }));
  const TIMES = [
    { value: 6, label: '06:00 AM (Early)' },
    { value: 7, label: '07:00 AM (Morning)' },
    { value: 9, label: '09:00 AM' },
    { value: 14, label: '02:00 PM (Afternoon)' },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🚜 Rent Farm Machine</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {/* Machine Summary Card */}
          <View style={styles.machineCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.machineTypeBadge}>{machine.type}</Text>
              <Text style={styles.machineName}>{machine.name}</Text>
              <Text style={styles.machineLoc}>
                Owner: {machine.ownerName} ({machine.distanceKm} km away)
              </Text>
            </View>
            <View style={styles.ratePill}>
              <Text style={styles.ratePillVal}>₹{machine.hourlyRate}/hr</Text>
            </View>
          </View>

          {/* Step 1: Select Date */}
          <Text style={styles.stepTitle}>1. Select Field Work Date</Text>
          <View style={styles.optionRow}>
            {DATES.map((d, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.chip, selectedDate === d.value && styles.chipActive]}
                onPress={() => setSelectedDate(d.value)}
              >
                <Text style={[styles.chipText, selectedDate === d.value && styles.chipTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Step 2: Select Start Time */}
          <Text style={styles.stepTitle}>2. Select Start Time</Text>
          <View style={styles.optionRow}>
            {TIMES.map((tVal, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.chip, selectedTime === tVal.value && styles.chipActive]}
                onPress={() => setSelectedTime(tVal.value)}
              >
                <Text style={[styles.chipText, selectedTime === tVal.value && styles.chipTextActive]}>
                  {tVal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Step 3: Duration (Hours or Full Days) */}
          <Text style={styles.stepTitle}>3. Select Duration</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, durationMode === 'HOURS' && styles.toggleBtnActive]}
              onPress={() => {
                setDurationMode('HOURS');
                setDurationValue(4);
              }}
            >
              <Text
                style={[styles.toggleText, durationMode === 'HOURS' && styles.toggleTextActive]}
              >
                Hourly Work
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, durationMode === 'DAYS' && styles.toggleBtnActive]}
              onPress={() => {
                setDurationMode('DAYS');
                setDurationValue(1);
              }}
            >
              <Text
                style={[styles.toggleText, durationMode === 'DAYS' && styles.toggleTextActive]}
              >
                Full Day / Multiple Days
              </Text>
            </TouchableOpacity>
          </View>

          {/* Duration Counter */}
          <View style={styles.counterRow}>
            <Text style={styles.counterLabel}>
              {durationMode === 'HOURS' ? 'Total Hours Required:' : 'Number of Days:'}
            </Text>
            <View style={styles.counterControl}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setDurationValue((prev) => Math.max(1, prev - 1))}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterVal}>
                {durationValue} {durationMode === 'HOURS' ? 'Hours' : 'Days'}
              </Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setDurationValue((prev) => prev + 1)}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step 4: With / Without Operator */}
          <Text style={styles.stepTitle}>4. Operator / Driver Option</Text>
          <View style={styles.toggleBox}>
            <TouchableOpacity
              style={[styles.choiceCard, withOperator && styles.choiceCardActive]}
              onPress={() => setWithOperator(true)}
            >
              <Text style={styles.choiceEmoji}>👨‍🌾</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>{t('withOperator')}</Text>
                <Text style={styles.choiceDesc}>Experienced tractor operator included (+₹150/hr)</Text>
              </View>
              {withOperator && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceCard, !withOperator && styles.choiceCardActive]}
              onPress={() => setWithOperator(false)}
            >
              <Text style={styles.choiceEmoji}>🚜</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>{t('withoutOperator')}</Text>
                <Text style={styles.choiceDesc}>You drive the machine yourself (Valid license required)</Text>
              </View>
              {!withOperator && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>
          </View>

          {/* Step 5: Delivery */}
          <Text style={styles.stepTitle}>5. Machine Delivery to Farm</Text>
          <View style={styles.toggleBox}>
            <TouchableOpacity
              style={[styles.choiceCard, withDelivery && styles.choiceCardActive]}
              onPress={() => setWithDelivery(true)}
            >
              <Text style={styles.choiceEmoji}>🚚</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>{t('farmDelivery')}</Text>
                <Text style={styles.choiceDesc}>Delivered directly to your field gate (₹{deliveryFee})</Text>
              </View>
              {withDelivery && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceCard, !withDelivery && styles.choiceCardActive]}
              onPress={() => setWithDelivery(false)}
            >
              <Text style={styles.choiceEmoji}>🏡</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>{t('selfPickup')}</Text>
                <Text style={styles.choiceDesc}>Collect machine from owner at Hubballi</Text>
              </View>
              {!withDelivery && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>
          </View>

          {/* Field Location Input */}
          {withDelivery && (
            <View style={styles.addressBox}>
              <Text style={styles.addressLabel}>Farm / Field Location Address:</Text>
              <TextInput
                style={styles.addressInput}
                value={farmAddress}
                onChangeText={setFarmAddress}
                placeholder="Enter village, survey no., landmark"
              />

              {/* Delivery GPS Location Card */}
              <View style={styles.gpsLocationCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gpsTitle}>Delivery GPS Coordinates</Text>
                    <Text style={styles.gpsSubtitle}>
                      {deliveryCoords.lat.toFixed(4)}, {deliveryCoords.lng.toFixed(4)}
                      {location?.gpsEnabled ? ' (Verified GPS)' : ' (Estimated)'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.gpsActionBtn}
                    onPress={async () => {
                      const res = await detectGpsLocation();
                      if (res) {
                        setDeliveryCoords({ lat: res.latitude, lng: res.longitude });
                        if (res.village) {
                          setFarmAddress(`${res.village}, Farm Gate, ${res.district || 'Dharwad'}`);
                        }
                      }
                    }}
                  >
                    <Text style={styles.gpsActionBtnText}>
                      {isLocating ? 'Acquiring GPS...' : '🎯 Use My Current Location'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.gpsActionBtn, { backgroundColor: '#ECEFF1' }]}
                    onPress={() => setShowPinMap(!showPinMap)}
                  >
                    <Text style={[styles.gpsActionBtnText, { color: '#37474F' }]}>
                      {showPinMap ? 'Hide Map' : '🗺️ Change Pin'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showPinMap && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 12, color: '#616161', marginBottom: 6 }}>
                      Drag the pin to your field / farm entrance:
                    </Text>
                    <LiveMap
                      height={180}
                      draggablePin={{
                        lat: deliveryCoords.lat,
                        lng: deliveryCoords.lng,
                        onDragEnd: (coords) => setDeliveryCoords(coords),
                      }}
                      onPinChange={(coords) => setDeliveryCoords(coords)}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 6: Payment Method */}
          <Text style={styles.stepTitle}>6. Payment Method</Text>
          <View style={styles.toggleBox}>
            <TouchableOpacity
              style={[styles.choiceCard, paymentMethod === 'CASH_AFTER_WORK' && styles.choiceCardActive]}
              onPress={() => setPaymentMethod('CASH_AFTER_WORK')}
            >
              <Text style={styles.choiceEmoji}>💵</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>{t('payCashAfterWork')}</Text>
                <Text style={styles.choiceDesc}>Pay machine owner after field work is completed</Text>
              </View>
              {paymentMethod === 'CASH_AFTER_WORK' && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceCard, paymentMethod === 'RAZORPAY' && styles.choiceCardActive]}
              onPress={() => setPaymentMethod('RAZORPAY')}
            >
              <Text style={styles.choiceEmoji}>💳</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>Razorpay Online Advance</Text>
                <Text style={styles.choiceDesc}>Instant advance/deposit via UPI, Cards, Netbanking</Text>
              </View>
              {paymentMethod === 'RAZORPAY' && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>
          </View>

          {/* Transparent Fare Breakdown Card */}
          <View style={styles.billCard}>
            <Text style={styles.billTitle}>🧾 Transparent Fare Breakdown</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Base Machine Rental:</Text>
              <Text style={styles.billVal}>₹{baseRental}</Text>
            </View>
            {withOperator && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Operator / Driver Fee:</Text>
                <Text style={styles.billVal}>₹{operatorFee}</Text>
              </View>
            )}
            {withDelivery && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Farm Delivery Charge:</Text>
                <Text style={styles.billVal}>₹{deliveryFee}</Text>
              </View>
            )}
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>GST (18%):</Text>
              <Text style={styles.billVal}>₹{gst}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Refundable Security Deposit:</Text>
              <Text style={styles.billVal}>₹{securityDeposit}</Text>
            </View>
            <View style={styles.billDivider} />
            <View style={styles.billRowTotal}>
              <Text style={styles.totalLabel}>Total Estimated Price:</Text>
              <Text style={styles.totalVal}>₹{totalAmount}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Booking Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm Rental Booking (₹{totalAmount}) →</Text>
            )}
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
  closeBtn: {
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.earth,
  },
  scrollArea: {
    flex: 1,
    padding: Spacing.l,
  },
  machineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEBE9',
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#D7CCC8',
    marginBottom: 16,
  },
  machineTypeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.earthMedium,
    textTransform: 'uppercase',
  },
  machineName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  machineLoc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratePill: {
    backgroundColor: Colors.earth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratePillVal: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F5F7F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1.5,
    borderColor: '#D0DCD0',
  },
  chipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: Spacing.borderRadiusButton,
    backgroundColor: '#F0F4F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D0DCD0',
  },
  toggleBtnActive: {
    backgroundColor: Colors.earth,
    borderColor: Colors.earth,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFBFB',
    padding: 12,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1,
    borderColor: '#E2EBE2',
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0ECE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  counterVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  toggleBox: {
    gap: 8,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    padding: 12,
    borderRadius: Spacing.borderRadiusButton,
    borderWidth: 1.5,
    borderColor: '#DCE5DC',
  },
  choiceCardActive: {
    backgroundColor: '#EFEBE9',
    borderColor: Colors.earth,
  },
  choiceEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  choiceDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.earth,
    marginLeft: 6,
  },
  addressBox: {
    marginTop: 8,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  addressInput: {
    backgroundColor: '#F0F4F0',
    borderRadius: Spacing.borderRadiusButton,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#C8D6C8',
    color: Colors.textPrimary,
  },
  gpsLocationCard: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F9FBF9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8E2D8',
  },
  gpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  gpsSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  gpsActionBtn: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  billCard: {
    backgroundColor: '#FFFDE7',
    padding: 14,
    borderRadius: Spacing.borderRadiusCard,
    borderWidth: 1.5,
    borderColor: '#FFF59D',
    marginTop: 18,
    marginBottom: 20,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E65100',
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  billLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  billVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#FFE082',
    marginVertical: 8,
  },
  billRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.earth,
  },
  footer: {
    height: 74,
    paddingHorizontal: Spacing.l,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderColor: '#E2EBE2',
    backgroundColor: '#FFFFFF',
  },
  confirmBtn: {
    backgroundColor: Colors.earth,
    height: 52,
    borderRadius: Spacing.borderRadiusButton,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
