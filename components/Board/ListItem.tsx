import React, { useEffect, useState } from "react";
import { useSupabase } from "@/context/SupabaseContext";
import { Task } from "@/types/enums";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, Image, Text, View } from "react-native";
import {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { client } from "@/utils/supabaseClient";
import { Colors } from "@/constants/Colors";

const ListItem = ({ item, drag, isActive }: RenderItemParams<Task>) => {
  const { getFileFromPath } = useSupabase();
  const router = useRouter();
  const [imagePath, setImagePath] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (item.image_url) {
      getFileFromPath!(item.image_url).then((path) => {
        if (path) {
          setImagePath(path);
        }
      });
    }
  }, [item.image_url]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (item.assigned_to) {
        try {
          console.log("Fetching user data for:", item.assigned_to);
          const { data, error } = await client
            .from("users")
            .select("avatar_url")
            .eq("id", item.assigned_to)
            .single();

          if (error) {
            console.error("Error fetching user data:", error);
          }

          if (data?.avatar_url) {
            console.log("Avatar URL found:", data.avatar_url);
            setAvatarUrl(data.avatar_url);
          } else {
            console.log("No avatar URL found for user:", item.assigned_to);
          }
        } catch (error) {
          console.error("Error in fetchUserData:", error);
        }
      } else {
        console.log("No assigned user for this item");
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, [item.assigned_to]);

  const openLink = () => {
    router.push(`/board/card/${item.id}`);
  };

  console.log("Rendering ListItem. Avatar URL:", avatarUrl);

  return (
    <ScaleDecorator>
      <TouchableOpacity
        activeOpacity={1}
        onPress={openLink}
        onLongPress={drag}
        disabled={isActive}
        style={[
          styles.rowItem,
          {
            opacity: isActive ? 0.5 : 1,
          },
        ]}
      >
        {item.image_url && imagePath && (
          <Image source={{ uri: imagePath }} style={styles.cardImage} />
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.titleText}>{item.title}</Text>
          {item.assigned_to && (
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.userAvatar}
                  onError={(e) =>
                    console.error("Error loading image:", e.nativeEvent.error)
                  }
                />
              ) : (
                <Text style={styles.avatarText}>
                  {item.assigned_to.substring(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );
};

const styles = StyleSheet.create({
  rowItem: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 4,
    backgroundColor: "#f3f3f3",
    marginBottom: 8,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleText: {
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 15,
    backgroundColor: Colors.gray,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  userAvatar: {
    //padding: 15,
    width: 24,
    height: 24,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 10,
  },
});

export default ListItem;
