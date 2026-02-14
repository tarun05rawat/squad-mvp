import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function CreateEventScreen({ route, navigation }) {
  const { squadId } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length >= 5) {
      Alert.alert('Limit', 'Maximum 5 options allowed');
      return;
    }
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      Alert.alert('Minimum', 'At least 2 options required');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (text, index) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    const filledOptions = options.filter(o => o.trim());
    if (filledOptions.length < 2) {
      Alert.alert('Error', 'Please enter at least 2 options');
      return;
    }

    setLoading(true);
    try {
      // Create event with 24h voting window
      const votingClosesAt = new Date();
      votingClosesAt.setHours(votingClosesAt.getHours() + 24);

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          squad_id: squadId,
          title: title.trim(),
          description: description.trim() || null,
          voting_closes_at: votingClosesAt.toISOString(),
          status: 'voting',
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create options
      const optionRows = filledOptions.map(name => ({
        event_id: event.id,
        option_name: name.trim(),
        vote_count: 0,
      }));

      const { error: optionsError } = await supabase
        .from('event_options')
        .insert(optionRows);

      if (optionsError) throw optionsError;

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>What's the plan?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Friday night dinner"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Any details..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Options ({options.length}/5)</Text>
      {options.map((option, index) => (
        <View key={index} style={styles.optionRow}>
          <TextInput
            style={[styles.input, styles.optionInput]}
            placeholder={`Option ${index + 1}`}
            value={option}
            onChangeText={(text) => updateOption(text, index)}
          />
          {options.length > 2 && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeOption(index)}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {options.length < 5 && (
        <TouchableOpacity style={styles.addButton} onPress={addOption}>
          <Text style={styles.addButtonText}>+ Add Option</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.submitText}>{loading ? 'Creating...' : 'Start Voting'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  optionInput: { flex: 1 },
  removeButton: { marginLeft: 8, padding: 8 },
  removeText: { fontSize: 18, color: '#999' },
  addButton: { padding: 12, alignItems: 'center', marginTop: 4 },
  addButtonText: { color: '#6C63FF', fontSize: 15, fontWeight: '500' },
  submitButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
