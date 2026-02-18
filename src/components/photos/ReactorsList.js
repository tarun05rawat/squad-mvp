import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function ReactorsList({ visible, photoId, emoji, onClose, onToggleReaction, userReacted }) {
  const { user } = useAuth();
  const [reactors, setReactors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && photoId && emoji) {
      fetchReactors();
    }
  }, [visible, photoId, emoji]);

  const fetchReactors = async () => {
    setLoading(true);
    try {
      // Fetch all reactions for this emoji on this photo
      const { data: reactionsData, error } = await supabase
        .from('photo_reactions')
        .select('user_id')
        .eq('photo_id', photoId)
        .eq('emoji', emoji);

      if (error) throw error;
      if (!reactionsData || reactionsData.length === 0) {
        setReactors([]);
        setLoading(false);
        return;
      }

      // Fetch user names
      const userIds = reactionsData.map(r => r.user_id);
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      setReactors(usersData || []);
    } catch (error) {
      console.error('Error fetching reactors:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{emoji} Reactions</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#8B5CF6" style={styles.loader} />
        ) : reactors.length === 0 ? (
          <Text style={styles.empty}>No reactions yet</Text>
        ) : (
          <FlatList
            data={reactors}
            keyExtractor={item => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.reactorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={styles.name}>{item.full_name}</Text>
              </View>
            )}
          />
        )}

        <TouchableOpacity
          style={[styles.toggleButton, userReacted && styles.toggleButtonActive]}
          onPress={() => { onToggleReaction(emoji); onClose(); }}
        >
          <Text style={[styles.toggleButtonText, userReacted && styles.toggleButtonTextActive]}>
            {userReacted ? `Remove your ${emoji}` : `React with ${emoji}`}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 20,
  },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
  },
  list: {
    maxHeight: 200,
  },
  reactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  toggleButton: {
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  toggleButtonActive: {
    backgroundColor: '#F3E8FF',
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#8B5CF6',
  },
});
