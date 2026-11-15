import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { useRealtime } from '../services/realtime';

/** Farmer reviews for a product, with live updates and a star-rating form. */
export const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (productId) api.getReviews(productId).then(setReviews).catch(() => setReviews([]));
  }, [productId]);

  useRealtime('review:new', (p) => {
    if (p.productId === productId) {
      setReviews((prev) => (prev.some((r) => r.id === p.review.id) ? prev : [p.review, ...prev]));
    }
  });

  const submit = async () => {
    setBusy(true);
    try {
      const review = await api.addReview(productId, rating, comment.trim());
      setReviews((prev) => (prev.some((r) => r.id === review.id) ? prev : [review, ...prev]));
      setComment('');
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>
        ⭐ Farmer Reviews {avg ? `· ${avg} (${reviews.length})` : ''}
      </Text>

      <View style={styles.form}>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)}>
              <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="How did this product work on your farm?"
          multiline
        />
        <TouchableOpacity style={styles.submit} onPress={submit} disabled={busy}>
          <Text style={styles.submitText}>{busy ? 'Posting…' : 'Post Review'}</Text>
        </TouchableOpacity>
      </View>

      {reviews.length === 0 && <Text style={styles.empty}>No reviews yet. Be the first!</Text>}
      {reviews.slice(0, 10).map((r) => (
        <View key={r.id} style={styles.review}>
          <Text style={styles.reviewHead}>
            {'★'.repeat(r.rating)}
            {'☆'.repeat(5 - r.rating)} · {r.user?.name || 'Farmer'}
            {r.user?.village ? `, ${r.user.village}` : ''}
          </Text>
          {r.isVerifiedPurchase && <Text style={styles.verified}>✓ Verified purchase</Text>}
          {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { marginTop: 16, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  heading: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  form: { backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: Colors.border },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 28, color: '#D0D0D0' },
  starOn: { color: Colors.harvestYellow },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    minHeight: 50,
    marginTop: 6,
    textAlignVertical: 'top',
  },
  submit: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '800' },
  empty: { color: Colors.textMuted, marginTop: 10 },
  review: { paddingVertical: 10, borderBottomWidth: 1, borderColor: Colors.divider },
  reviewHead: { fontWeight: '700', color: Colors.textPrimary },
  verified: { color: Colors.success, fontSize: 11, fontWeight: '700', marginTop: 2 },
  comment: { color: Colors.textSecondary, marginTop: 4 },
});
