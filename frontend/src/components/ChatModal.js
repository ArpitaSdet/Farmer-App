import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { api } from '../services/api';
import { sendChat, useRealtime } from '../services/realtime';
import { useAuth } from '../context/AuthContext';

const QUICK_REPLIES = ['I am waiting at the farm gate', 'Please call me when you are near', 'On the way, 10 minutes', 'Thank you!'];

/** Live chat for an order / rental room (farmer ↔ driver, farmer ↔ machine owner). */
export const ChatModal = ({ visible, room, title, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!visible || !room) return;
    setError('');
    api
      .get(`/chat/${encodeURIComponent(room)}`)
      .then(setMessages)
      .catch((e) => setError(e.message));
  }, [visible, room]);

  useRealtime('chat:message', (m) => {
    if (m.room === room) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  });

  const send = async (body) => {
    const value = (body ?? text).trim();
    if (!value) return;
    setText('');
    const res = await sendChat(room, value);
    if (!res?.success) setError('Message not sent. Check your connection.');
    else setMessages((prev) => (prev.some((x) => x.id === res.message.id) ? prev : [...prev, res.message]));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            💬 {title}
          </Text>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.list}
          contentContainerStyle={{ padding: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && <Text style={styles.empty}>No messages yet. Say namaste 🙏</Text>}
          {messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                {!mine && (
                  <Text style={styles.sender}>
                    {m.senderName || 'User'} · {m.senderRole?.toLowerCase()}
                  </Text>
                )}
                <Text style={[styles.text, mine && { color: '#fff' }]}>{m.text}</Text>
                <Text style={[styles.time, mine && { color: '#E8F5E9' }]}>
                  {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <ScrollView horizontal style={styles.quickRow} showsHorizontalScrollIndicator={false}>
          {QUICK_REPLIES.map((q) => (
            <TouchableOpacity key={q} style={styles.quick} onPress={() => send(q)}>
              <Text style={styles.quickText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity style={styles.send} onPress={() => send()}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, padding: 14, gap: 14 },
  close: { color: '#fff', fontSize: 20, fontWeight: '700' },
  title: { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 },
  list: { flex: 1 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 10, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: Colors.primaryMedium },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border },
  sender: { fontSize: 11, fontWeight: '700', color: Colors.info, marginBottom: 2 },
  text: { fontSize: 15, color: Colors.textPrimary },
  time: { fontSize: 10, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  error: { color: Colors.danger, textAlign: 'center', padding: 4 },
  quickRow: { flexGrow: 0, paddingHorizontal: 8, paddingVertical: 6 },
  quick: {
    backgroundColor: Colors.primarySurface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  quickText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: Colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15 },
  send: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 18, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '800' },
});
