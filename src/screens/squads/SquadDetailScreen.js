import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import FeedTab from '../../components/feed/FeedTab';
import PhotosTab from '../../components/photos/PhotosTab';
import PhotoUploadModal from '../../components/photos/PhotoUploadModal';
import PhotoFullscreen from '../../components/photos/PhotoFullscreen';

export default function SquadDetailScreen({ route, navigation }) {
  const { squadId, squadName } = route.params;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [inviteCode, setInviteCode] = useState('');

  useFocusEffect(useCallback(() => {
    fetchEvents();
    fetchMembers();
    fetchInviteCode();
  }, []));

  const fetchInviteCode = async () => {
    const { data, error } = await supabase
      .from('squads')
      .select('invite_code')
      .eq('id', squadId)
      .single();

    if (!error && data) {
      setInviteCode(data.invite_code);
    }
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join my squad "${squadName}" on Squad!\n\nInvite Code: ${inviteCode}\n\nDownload the app and use this code to join.`,
        title: 'Join My Squad',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share invite');
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Auto-update status to 'decided' if voting window closed
      const now = new Date();
      const updatedEvents = [];

      for (const event of data) {
        if (event.status === 'voting' && new Date(event.voting_closes_at) < now) {
          // Update status to decided
          await supabase
            .from('events')
            .update({ status: 'decided' })
            .eq('id', event.id);

          updatedEvents.push({ ...event, status: 'decided' });
        } else {
          updatedEvents.push(event);
        }
      }

      setEvents(updatedEvents);
    }
  };

  const fetchMembers = async () => {
    // Fetch squad members and then manually join with users
    const { data: squadMembers, error: membersError } = await supabase
      .from('squad_members')
      .select('user_id, joined_at')
      .eq('squad_id', squadId);

    if (membersError) {
      console.error('Error fetching squad members:', membersError);
      Alert.alert('Error', 'Could not load squad members');
      setMembers([]);
      return;
    }

    if (!squadMembers || squadMembers.length === 0) {
      setMembers([]);
      return;
    }

    // Fetch user details for all members
    const userIds = squadMembers.map(m => m.user_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching user details:', usersError);
      Alert.alert('Error', 'Could not load member details');
      setMembers([]);
      return;
    }

    // Combine the data
    const membersWithDetails = squadMembers.map(member => ({
      user_id: member.user_id,
      joined_at: member.joined_at,
      users: users.find(u => u.id === member.user_id) || null
    }));

    console.log('Fetched members with details:', membersWithDetails);
    setMembers(membersWithDetails);
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
    // Handle both nested and direct user data
    const userData = item.users || item;
    const email = userData?.email || '';
    const emailPrefix = email ? email.split('@')[0] : 'No email';
    const fullName = userData?.full_name || 'Unknown User';
    const isCurrentUser = item.user_id === user?.id;

    return (
      <View style={styles.memberRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.memberName}>{fullName}</Text>
            {isCurrentUser && <Text style={styles.youBadge}>You</Text>}
          </View>
          <Text style={styles.memberEmail}>{emailPrefix}</Text>
        </View>
      </View>
    );
  };

  const handlePhotoPress = (photo) => {
    setSelectedPhoto(photo);
  };

  const handlePhotoDelete = (photoId) => {
    setSelectedPhoto(null);
  };

  const handlePhotoUploadSuccess = () => {
    // Photo uploaded successfully, photos tab will auto-refresh via real-time subscription
  };

  const handleEventPress = async (eventId) => {
    // Try to find event in local state first
    let event = events.find(e => e.id === eventId);

    // If not found (e.g., Feed loaded before Events tab), fetch from DB
    if (!event) {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, status')
        .eq('id', eventId)
        .single();

      if (!error && data) {
        event = data;
      }
    }

    if (event) {
      // If voting is ongoing, check if user has already voted on all options
      if (event.status === 'voting') {
        const { data: userVotes } = await supabase
          .from('event_votes')
          .select('option_id')
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        const { data: allOptions } = await supabase
          .from('event_options')
          .select('id')
          .eq('event_id', eventId);

        const hasVotedAll = userVotes?.length > 0 && userVotes?.length === allOptions?.length;

        // If user has voted on all options, show results instead of voting screen
        if (hasVotedAll) {
          navigation.navigate('EventResult', { eventId: event.id, eventTitle: event.title });
        } else {
          navigation.navigate('SwipeVoting', { eventId: event.id, eventTitle: event.title });
        }
      } else {
        navigation.navigate('EventResult', { eventId: event.id, eventTitle: event.title });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.activeTab]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
          onPress={() => setActiveTab('photos')}
        >
          <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'feed' ? (
        <FeedTab
          squadId={squadId}
          onPhotoPress={handlePhotoPress}
          onEventPress={handleEventPress}
        />
      ) : activeTab === 'events' ? (
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
      ) : activeTab === 'photos' ? (
        <>
          <PhotosTab squadId={squadId} onPhotoPress={handlePhotoPress} />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowPhotoUploadModal(true)}
          >
            <Text style={styles.fabText}>+ Upload Photo</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <FlatList
            data={members}
            renderItem={renderMember}
            keyExtractor={item => item.user_id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>No members yet</Text>}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowInviteModal(true)}
          >
            <Text style={styles.fabText}>+ Invite Member</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Invite Member Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite to {squadName}</Text>
            <Text style={styles.modalSubtitle}>Share this code with others to invite them:</Text>

            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCodeText}>{inviteCode}</Text>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={handleShareInvite}>
              <Text style={styles.shareButtonText}>Share Invite</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        visible={showPhotoUploadModal}
        onClose={() => setShowPhotoUploadModal(false)}
        squadId={squadId}
        onUploadSuccess={handlePhotoUploadSuccess}
      />

      {/* Photo Fullscreen View */}
      <PhotoFullscreen
        visible={!!selectedPhoto}
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onDelete={handlePhotoDelete}
      />
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
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '500', color: '#333' },
  youBadge: { fontSize: 12, fontWeight: '600', color: '#6C63FF', backgroundColor: '#E8E6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  memberEmail: { fontSize: 13, color: '#999', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  emptySubtext: { textAlign: 'center', color: '#BBB', marginTop: 8, fontSize: 13, paddingHorizontal: 40 },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  inviteCodeBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
  },
  inviteCodeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6C63FF',
    textAlign: 'center',
    letterSpacing: 4,
  },
  shareButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
    fontSize: 15,
  },
});
