import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

export default function SquadDetailScreen({ route, navigation }) {
  const { squadId, squadName } = route.params;
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);

  useFocusEffect(useCallback(() => {
    fetchEvents();
    fetchMembers();
  }, []));

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false });

    if (!error) setEvents(data || []);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('squad_members')
      .select('user_id, users(full_name, email)')
      .eq('squad_id', squadId);

    if (!error) setMembers(data || []);
  };

  const getStatusColor = (status) => {
    return status === 'voting' ? '#4CAF50' : '#6C63FF';
  };

  const renderEvent = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (item.status === 'voting') {
          navigation.navigate('SwipeVoting', { eventId: item.id, eventTitle: item.title });
        } else {
          navigation.navigate('EventResult', { eventId: item.id, eventTitle: item.title });
        }
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      {item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
    </TouchableOpacity>
  );

  const renderMember = ({ item }) => {
    const email = item.users?.email || '';
    const emailPrefix = email.split('@')[0];
    return (
      <View style={styles.memberRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.users?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.memberName}>{item.users?.full_name || 'Unknown'}</Text>
          <Text style={styles.memberEmail}>{emailPrefix}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'events' ? (
        <>
          <FlatList
            data={events}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No events yet</Text>}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('CreateEvent', { squadId })}
          >
            <Text style={styles.fabText}>+ New Event</Text>
          </TouchableOpacity>
        </>
      ) : (
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={item => item.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No members yet</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, padding: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#6C63FF' },
  tabText: { fontSize: 15, color: '#999' },
  activeTabText: { color: '#6C63FF', fontWeight: '600' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  cardDesc: { fontSize: 14, color: '#666', marginTop: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  memberName: { fontSize: 15, fontWeight: '500', color: '#333' },
  memberEmail: { fontSize: 13, color: '#999' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#6C63FF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
