import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/spacing';
import { useLanguage } from '../context/LanguageContext';

export const CategoryGrid = ({ categories = [], onSelectCategory }) => {
  const { currentLanguage } = useLanguage();

  const getLocalizedCategoryName = (cat) => {
    if (currentLanguage === 'kn' && cat.name_kn) return cat.name_kn;
    if (currentLanguage === 'hi' && cat.name_hi) return cat.name_hi;
    if (currentLanguage === 'mr' && cat.name_mr) return cat.name_mr;
    if (currentLanguage === 'te' && cat.name_te) return cat.name_te;
    if (currentLanguage === 'ta' && cat.name_ta) return cat.name_ta;
    return cat.name;
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>🌾 All Farm Categories</Text>
        <Text style={styles.sectionSub}>Tap to browse verified products</Text>
      </View>

      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id || cat.slug}
            style={styles.card}
            onPress={() => onSelectCategory(cat.slug)}
            activeOpacity={0.8}
          >
            <View style={styles.imageWrapper}>
              <Image source={{ uri: cat.image }} style={styles.image} resizeMode="cover" />
              <View style={styles.emojiOverlay}>
                <Text style={styles.categoryEmoji}>{cat.icon || '🌱'}</Text>
              </View>
            </View>

            <Text style={styles.categoryName} numberOfLines={2}>
              {getLocalizedCategoryName(cat)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.l,
    marginVertical: 12,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '23%',
    minWidth: 76,
    alignItems: 'center',
    marginBottom: 8,
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  emojiOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
  },
});
