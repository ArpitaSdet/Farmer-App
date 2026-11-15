import React from 'react';
import {
  StyleSheet,
  Platform,
  StatusBar,
  View,
  ActivityIndicator,
  Text,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/context/LanguageContext';
import { LocationProvider } from './src/context/LocationContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { BottomNavigator } from './src/navigation/BottomNavigator';
import { OwnerScreen } from './src/screens/OwnerScreen';
import { DeliveryScreen } from './src/screens/DeliveryScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { Colors } from './src/theme/colors';

const { width, height } = Dimensions.get('window');

const RootContent = () => {
  const { user, booting, logout } = useAuth();

  if (booting) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>🌾</Text>
        <Text style={styles.splashTitle}>Kisan Kendra</Text>
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;
  if (user.role === 'ADMIN') return <AdminScreen onLogout={logout} />;
  if (user.role === 'OWNER') return <OwnerScreen onLogout={logout} />;
  if (user.role === 'DRIVER') return <DeliveryScreen onLogout={logout} />;
  return <BottomNavigator />;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} translucent={false} />
        <LanguageProvider>
          <LocationProvider>
            <AuthProvider>
              <CartProvider>
                <RootContent />
              </CartProvider>
            </AuthProvider>
          </LocationProvider>
        </LanguageProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  splashLogo: { fontSize: 64, marginBottom: 8 },
  splashTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
});
