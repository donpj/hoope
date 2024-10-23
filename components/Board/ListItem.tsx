import React from "react";
import { StyleSheet, TouchableOpacity, Text, View } from "react-native";
import { RenderItemParams } from "react-native-draggable-flatlist";
import { Colors } from "@/constants/Colors";
import UserAvatar from "@/components/User/UserAvatar";
import { Task } from "@/types/enums";
import { useRouter } from "expo-router";

interface User {
  id: string;
  first_name: string | null;
  email: string;
  avatar_url: string | null;
}

const ListItem = ({ item, drag, isActive }: RenderItemParams<Task>) => {
  const assignedUsers = item.assigned_users || [];
  const router = useRouter();

  const handlePress = () => {
    router.push(`/board/card/${item.id}`);
  };

  return (
    <TouchableOpacity
      onLongPress={drag}
      onPress={handlePress}
      disabled={isActive}
      style={styles.container}
    >
      <Text style={styles.title}>{item.title}</Text>
      <View style={styles.avatarsContainer}>
        {assignedUsers.slice(0, 3).map((user: User, index: number) => (
          <View
            key={user.id}
            style={[
              styles.avatarWrapper,
              { marginLeft: index > 0 ? -10 : 0, zIndex: 3 - index },
            ]}
          >
            <UserAvatar
              user={{
                first_name: user.first_name || "",
                email: user.email,
                avatar_url: user.avatar_url || undefined,
              }}
              size={24}
            />
          </View>
        ))}
        {assignedUsers.length > 3 && (
          <View style={[styles.avatarContainer, styles.extraAvatars]}>
            <Text style={styles.extraAvatarsText}>
              +{assignedUsers.length - 3}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 12,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  avatarsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 12,
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  extraAvatars: {
    backgroundColor: Colors.lightGray,
  },
  extraAvatarsText: {
    color: Colors.gray,
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default ListItem;
