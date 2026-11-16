import React from 'react';
import {
  StyleSheet,
  Platform,
  StatusBar,
  View,
  ActivityIndicator,
  Text,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>
            {this.state.error?.message || 'The application encountered an unexpected error.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryBtnText}>Restart Application</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
