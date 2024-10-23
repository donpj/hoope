import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { client } from "@/utils/supabaseClient";
import { Colors } from "@/constants/Colors";

interface UserListItemProps {
  onPress: () => void;
  user: {
    id: string;
    first_name?: string;
    email: string;
  };
  selected: boolean;
}

const UserListItem: React.FC<UserListItemProps> = ({
  onPress,
  user,
  selected,
}) => {
  // Add this check at the beginning of the component
  if (!user) {
    return null; // or return a loading placeholder
  }

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAvatar = async () => {
      try {
        const { data, error } = await client
          .from("users")
          .select("avatar_url")
          .eq("id", user.id)
          .single();

        if (data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (error) {
        console.error("Error fetching user avatar:", error);
      }
    };

    fetchUserAvatar();
  }, [user.id]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, selected && styles.selectedContainer]}
    >
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <Text style={styles.avatarText}>
            {user.first_name
              ? user.first_name.charAt(0).toUpperCase()
              : user.email.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.name}>{user.first_name || user.email}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>
      {selected && (
        <View style={styles.checkmarkContainer}>
          <Ionicons name="checkmark-circle" size={24} color="green" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginHorizontal: 4,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 40,
    height: 40,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  email: {
    fontSize: 14,
    color: "gray",
  },
  selectedContainer: {
    backgroundColor: "rgba(0, 255, 0, 0.1)", // Light green background for selected items
  },
  checkmarkContainer: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -12 }], // Half the size of the icon
  },
});

export default UserListItem;
