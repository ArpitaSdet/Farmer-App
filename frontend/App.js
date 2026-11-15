import React from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar, View, ActivityIndicator, Text } from 'react-native';
import { LanguageProvider } from './src/context/LanguageContext';
import { LocationProvider } from './src/context/LocationContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { BottomNavigator } from './src/navigation/BottomNavigator';
import { OwnerScreen } from './src/screens/OwnerScreen';
import { DeliveryScreen } from './src/screens/DeliveryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { Colors } from './src/theme/colors';

const RootContent = () => {
  const { user, booting, logout } = useAuth();

  if (booting) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>🌾</Text>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;
  if (user.role === 'OWNER') return <OwnerScreen onLogout={logout} />;
  if (user.role === 'DRIVER') return <DeliveryScreen onLogout={logout} />;
  return <BottomNavigator />;
};

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
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
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  splashLogo: { fontSize: 64, marginBottom: 16 },
});
