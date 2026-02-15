import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, FlatList } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function SwipeVotingScreen({ route, navigation }) {
  const { eventId, eventTitle } = route.params;
  const { user } = useAuth();
  const [options, setOptions] = useState([]);
  const [allOptions, setAllOptions] = useState([]);
  const [voters, setVoters] = useState({});
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const swiperRef = useRef(null);

  useEffect(() => {
    fetchOptions();
    const cleanup = subscribeToVotes();
    return cleanup;
  }, []);

  const fetchVoters = async () => {
    const { data } = await supabase
      .from('event_votes')
      .select('option_id, users(full_name)')
      .eq('event_id', eventId);

    const voterMap = {};
    (data || []).forEach(v => {
      if (!voterMap[v.option_id]) voterMap[v.option_id] = [];
      voterMap[v.option_id].push(v.users?.full_name || 'Unknown');
    });
    setVoters(voterMap);
  };

  const fetchOptions = async () => {
    // Get options
    const { data: fetchedOptions, error } = await supabase
      .from('event_options')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setAllOptions(fetchedOptions || []);

    // Get user's existing votes
    const { data: userVotes } = await supabase
      .from('event_votes')
      .select('option_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    const votedOptionIds = (userVotes || []).map(v => v.option_id);

    // Filter out already-voted options
    const unvotedOptions = (fetchedOptions || []).filter(o => !votedOptionIds.includes(o.id));

    if (unvotedOptions.length === 0) {
      setAllSwiped(true);
    }

    setOptions(unvotedOptions);
    await fetchVoters();
    setLoading(false);
  };

  const subscribeToVotes = () => {
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_options', filter: `event_id=eq.${eventId}` },
        (payload) => {
          setOptions(prev =>
            prev.map(o => o.id === payload.new.id ? { ...o, vote_count: payload.new.vote_count } : o)
          );
          setAllOptions(prev =>
            prev.map(o => o.id === payload.new.id ? { ...o, vote_count: payload.new.vote_count } : o)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_votes', filter: `event_id=eq.${eventId}` },
        () => {
          fetchVoters();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleSwipeRight = async (cardIndex) => {
    const option = options[cardIndex];
    try {
      // Record vote
      await supabase.from('event_votes').insert({
        event_id: eventId,
        option_id: option.id,
        user_id: user.id,
      });

      // Increment vote count
      await supabase
        .from('event_options')
        .update({ vote_count: option.vote_count + 1 })
        .eq('id', option.id);
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const handleSwipeLeft = (cardIndex) => {
    // Skip — no vote recorded
  };

  const handleAllSwiped = () => {
    setAllSwiped(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading options...</Text>
      </View>
    );
  }

  if (allSwiped) {
    const sortedOptions = [...allOptions].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    return (
      <View style={styles.container}>
        <Text style={styles.header}>{eventTitle}</Text>
        <Text style={styles.doneTitle}>You've voted!</Text>
        <Text style={styles.doneSubtitle}>Live tally:</Text>
        <FlatList
          data={sortedOptions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tallyList}
          renderItem={({ item }) => {
            const itemVoters = voters[item.id] || [];
            return (
              <View style={styles.tallyRow}>
                <View style={styles.tallyInfo}>
                  <Text style={styles.tallyName}>{item.option_name}</Text>
                  <Text style={styles.tallyCount}>{item.vote_count || 0} votes</Text>
                </View>
                {itemVoters.length > 0 && (
                  <Text style={styles.tallyVoters}>
                    {itemVoters.join(', ')}
                  </Text>
                )}
              </View>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{eventTitle}</Text>
      <Text style={styles.instructions}>Swipe right to vote YES, left to skip</Text>

      <View style={styles.swiperContainer}>
        <Swiper
          ref={swiperRef}
          cards={options}
          renderCard={(card) => {
            const cardVoters = voters[card?.id] || [];
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{card?.option_name}</Text>
                <Text style={styles.cardVotes}>{card?.vote_count || 0} votes</Text>
                {cardVoters.length > 0 && (
                  <Text style={styles.cardVoters}>
                    {cardVoters.join(', ')}
                  </Text>
                )}
              </View>
            );
          }}
          onSwipedRight={handleSwipeRight}
          onSwipedLeft={handleSwipeLeft}
          onSwipedAll={handleAllSwiped}
          cardIndex={0}
          backgroundColor="transparent"
          stackSize={3}
          stackSeparation={15}
          animateOverlayLabelsOpacity
          overlayLabels={{
            left: {
              title: 'SKIP',
              style: {
                label: styles.overlayLabelLeft,
                wrapper: styles.overlayWrapperLeft,
              },
            },
            right: {
              title: 'YES!',
              style: {
                label: styles.overlayLabelRight,
                wrapper: styles.overlayWrapperRight,
              },
            },
          }}
          disableBottomSwipe
          disableTopSwipe
        />
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hintLeft}>← Skip</Text>
        <Text style={styles.hintRight}>Vote →</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 16, color: '#666' },
  header: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 16, color: '#333' },
  instructions: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  swiperContainer: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    height: 300,
  },
  cardTitle: { fontSize: 28, fontWeight: '700', color: '#333', textAlign: 'center' },
  cardVotes: { fontSize: 16, color: '#6C63FF', marginTop: 16, fontWeight: '500' },
  cardVoters: { fontSize: 13, color: '#999', marginTop: 8, textAlign: 'center' },
  tallyList: { padding: 16 },
  tallyRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  tallyInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tallyName: { fontSize: 15, fontWeight: '600', color: '#333' },
  tallyCount: { fontSize: 14, fontWeight: '600', color: '#6C63FF' },
  tallyVoters: { fontSize: 13, color: '#666', marginTop: 4 },
  overlayLabelLeft: { color: '#FF6B6B', fontSize: 24, fontWeight: '700', borderWidth: 2, borderColor: '#FF6B6B', borderRadius: 8, padding: 8 },
  overlayWrapperLeft: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 30, marginLeft: -30 },
  overlayLabelRight: { color: '#4CAF50', fontSize: 24, fontWeight: '700', borderWidth: 2, borderColor: '#4CAF50', borderRadius: 8, padding: 8 },
  overlayWrapperRight: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 30, marginLeft: 30 },
  hintRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, paddingBottom: 30 },
  hintLeft: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  hintRight: { fontSize: 16, color: '#4CAF50', fontWeight: '500' },
  doneEmoji: { fontSize: 48, color: '#4CAF50', marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '700', color: '#333', textAlign: 'center', marginTop: 8 },
  doneSubtitle: { fontSize: 16, color: '#666', marginTop: 8, textAlign: 'center', marginBottom: 4 },
});
