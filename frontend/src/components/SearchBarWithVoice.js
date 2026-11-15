import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

export const SearchBarWithVoice = ({
  searchQuery,
  onChangeSearch,
  onOpenVoiceSearch,
  onSubmitSearch,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.outerContainer}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={onChangeSearch}
          onSubmitEditing={onSubmitSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onChangeSearch('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}

        {/* TODO: Voice search mic hidden. Integrate real vernacular speech-to-text (STT) for Indian languages in Phase 6 */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: Spacing.l,
    marginTop: -8,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderRadius: Spacing.borderRadiusButton,
    height: 52,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#C8D8C8',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 6,
    marginRight: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '700',
  },
});
