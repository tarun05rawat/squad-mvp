import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function SquadListScreen({ navigation }) {
  const { user } = useAuth();

  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");

  const fetchSquads = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("squad_members")
      .select("squads(id, name, invite_code)")
      .eq("user_id", user.id);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSquads(data.map((row) => row.squads));
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchSquads();
    }, []),
  );

  const generateInviteCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const createSquad = async () => {
    if (!newSquadName.trim()) {
      Alert.alert("Error", "Squad name is required");
      return;
    }

    const invite_code = generateInviteCode();

    // 1️⃣ Create squad
    const { data: squad, error: squadError } = await supabase
      .from("squads")
      .insert({
        name: newSquadName.trim(),
        invite_code,
      })
      .select()
      .single();

    if (squadError) {
      Alert.alert("Error", squadError.message);
      return;
    }

    // 2️⃣ Add creator as member (CRITICAL)
    const { error: memberError } = await supabase.from("squad_members").insert({
      squad_id: squad.id,
      user_id: user.id,
    });

    if (memberError) {
      Alert.alert("Error", memberError.message);
      return;
    }

    setShowCreateModal(false);
    setNewSquadName("");
    fetchSquads();
  };

  const joinSquad = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }

    const { data: squad, error } = await supabase
      .from("squads")
      .select("*")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .single();

    if (error || !squad) {
      Alert.alert("Error", "Squad not found");
      return;
    }

    const { error: joinError } = await supabase.from("squad_members").insert({
      squad_id: squad.id,
      user_id: user.id,
    });

    if (joinError) {
      Alert.alert("Error", joinError.message);
      return;
    }

    setShowJoinModal(false);
    setInviteCode("");
    fetchSquads();
  };

  const renderSquad = ({ item }) => (
    <TouchableOpacity
      style={styles.squadCard}
      onPress={() =>
        navigation.navigate("SquadDetail", {
          squadId: item.id,
          squadName: item.name,
        })
      }
    >
      <Text style={styles.squadName}>{item.name}</Text>
      <Text style={styles.squadCode}>Code: {item.invite_code}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={squads}
        renderItem={renderSquad}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>
              No squads yet. Create one or join with an invite code!
            </Text>
          )
        }
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.actionButtonText}>Create Squad</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => setShowJoinModal(true)}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Join Squad
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Squad Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Squad</Text>
            <TextInput
              style={styles.input}
              placeholder="Squad name"
              value={newSquadName}
              onChangeText={setNewSquadName}
            />
            <TouchableOpacity style={styles.actionButton} onPress={createSquad}>
              <Text style={styles.actionButtonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setNewSquadName("");
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Join Squad Modal */}
      <Modal visible={showJoinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join a Squad</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter invite code"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.actionButton} onPress={joinSquad}>
              <Text style={styles.actionButtonText}>Join</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowJoinModal(false);
                setInviteCode("");
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  list: { padding: 16 },
  squadCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  squadName: { fontSize: 18, fontWeight: "600", color: "#333" },
  squadCode: { fontSize: 13, color: "#999", marginTop: 4 },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
    fontSize: 15,
    paddingHorizontal: 40,
  },
  buttonRow: { flexDirection: "row", padding: 16, gap: 12 },
  actionButton: {
    flex: 1,
    backgroundColor: "#6C63FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#6C63FF",
  },
  secondaryButtonText: { color: "#6C63FF" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  cancelText: {
    textAlign: "center",
    color: "#999",
    marginTop: 16,
    fontSize: 15,
  },
});
