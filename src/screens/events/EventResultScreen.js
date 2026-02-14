import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function EventResultScreen({ route }) {
  const { eventId, eventTitle } = route.params;
  const { user } = useAuth();
  const [options, setOptions] = useState([]);
  const [voters, setVoters] = useState({});
  const [rsvp, setRsvp] = useState(null); // 'in' or 'out'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    const { data, error } = await supabase
      .from('event_options')
      .select('*')
      .eq('event_id', eventId)
      .order('vote_count', { ascending: false });

    if (!error) setOptions(data || []);

    // Fetch voters
    const { data: voteData } = await supabase
      .from('event_votes')
      .select('option_id, users(full_name)')
      .eq('event_id', eventId);

    const voterMap = {};
    (voteData || []).forEach(v => {
      if (!voterMap[v.option_id]) voterMap[v.option_id] = [];
      voterMap[v.option_id].push(v.users?.full_name || 'Unknown');
    });
    setVoters(voterMap);

    setLoading(false);
  };

  const winner = options[0];
  const totalVotes = options.reduce((sum, o) => sum + (o.vote_count || 0), 0);

  const renderOption = ({ item, index }) => {
    const percentage = totalVotes > 0 ? Math.round((item.vote_count / totalVotes) * 100) : 0;
    const isWinner = index === 0;
    const optionVoters = voters[item.id] || [];

    return (
      <View style={[styles.optionRow, isWinner && styles.winnerRow]}>
        <View style={styles.optionInfo}>
          <Text style={[styles.optionName, isWinner && styles.winnerName]}>
            {isWinner ? '🏆 ' : ''}{item.option_name}
          </Text>
          <Text style={styles.voteCount}>{item.vote_count} votes</Text>
        </View>
        <View style={styles.barContainer}>
          <View style={[styles.bar, { width: `${percentage}%` }, isWinner && styles.winnerBar]} />
        </View>
        <View style={styles.optionFooter}>
          {optionVoters.length > 0 && (
            <Text style={styles.voterNames}>{optionVoters.join(', ')}</Text>
          )}
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading results...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{eventTitle}</Text>

      {winner && (
        <View style={styles.winnerCard}>
          <Text style={styles.winnerLabel}>Winner</Text>
          <Text style={styles.winnerTitle}>{winner.option_name}</Text>
          <Text style={styles.winnerVotes}>
            {winner.vote_count} votes ({totalVotes > 0 ? Math.round((winner.vote_count / totalVotes) * 100) : 0}%)
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>All Results ({totalVotes} total votes)</Text>
      <FlatList
        data={options}
        renderItem={renderOption}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />

      <View style={styles.rsvpSection}>
        <Text style={styles.rsvpTitle}>Are you in?</Text>
        <View style={styles.rsvpRow}>
          <TouchableOpacity
            style={[styles.rsvpButton, rsvp === 'in' && styles.rsvpIn]}
            onPress={() => setRsvp('in')}
          >
            <Text style={[styles.rsvpText, rsvp === 'in' && styles.rsvpTextActive]}>I'm in!</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rsvpButton, rsvp === 'out' && styles.rsvpOut]}
            onPress={() => setRsvp('out')}
          >
            <Text style={[styles.rsvpText, rsvp === 'out' && styles.rsvpTextActive]}>I'm out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 16, color: '#333' },
  winnerCard: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignItems: 'center',
  },
  winnerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  winnerTitle: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 8 },
  winnerVotes: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', paddingHorizontal: 16, marginTop: 8 },
  list: { padding: 16 },
  optionRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  winnerRow: { borderWidth: 2, borderColor: '#6C63FF' },
  optionInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  optionName: { fontSize: 15, fontWeight: '500', color: '#333' },
  winnerName: { color: '#6C63FF', fontWeight: '700' },
  voteCount: { fontSize: 13, color: '#999' },
  barContainer: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: '#ddd', borderRadius: 4 },
  winnerBar: { backgroundColor: '#6C63FF' },
  optionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  voterNames: { fontSize: 12, color: '#666', flex: 1, marginRight: 8 },
  percentage: { fontSize: 13, color: '#666', textAlign: 'right' },
  rsvpSection: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  rsvpTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  rsvpRow: { flexDirection: 'row', gap: 12 },
  rsvpButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  rsvpIn: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  rsvpOut: { borderColor: '#FF6B6B', backgroundColor: '#FFEBEE' },
  rsvpText: { fontSize: 16, fontWeight: '600', color: '#666' },
  rsvpTextActive: { color: '#333' },
});
