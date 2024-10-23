import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Colors } from "@/constants/Colors";

interface UserAvatarProps {
  user: {
    first_name?: string;
    email: string;
    avatar_url?: string;
  };
  size?: number;
  style?: object;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 40, style }) => {
  const initials = user.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {user.avatar_url ? (
        <Image
          source={{ uri: user.avatar_url }}
          style={[styles.image, { width: size, height: size }]}
          onError={(e) =>
            console.error("Error loading image:", e.nativeEvent.error)
          }
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    color: Colors.gray,
    fontWeight: "bold",
  },
});

export default UserAvatar;
