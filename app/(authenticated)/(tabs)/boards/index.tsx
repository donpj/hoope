import DropdownPlus from "@/components/DropdownPlus";
import { Colors } from "@/constants/Colors";
import { useSupabase } from "@/context/SupabaseContext";
import { Board } from "@/types/enums";
import { Link, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { RectButton } from "react-native-gesture-handler";
import { Animated } from "react-native";
import { useRoute } from "@react-navigation/native";

const Page = () => {
  const route = useRoute();
  const { getBoards, deleteBoard, leaveBoard } = useSupabase();
  const [boards, setBoards] = useState<Board[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBoards();
    }, [route.params?.refresh])
  );

  const loadBoards = async () => {
    setRefreshing(true);
    const data = await getBoards!();
    console.log("Boards data:", JSON.stringify(data, null, 2));
    const uniqueBoards = data.filter(
      (board, index, self) => index === self.findIndex((t) => t.id === board.id)
    );
    console.log("Unique boards:", JSON.stringify(uniqueBoards, null, 2));
    setBoards(uniqueBoards);
    setRefreshing(false);
  };

  const handleDeleteBoard = async (boardId: number) => {
    try {
      console.log(`Attempting to delete board with ID: ${boardId}`);
      const result = await deleteBoard!(boardId.toString());
      console.log(`Delete board result:`, result);

      if (result.error) {
        console.error("Error deleting board:", result.error);
        Alert.alert(
          "Error",
          `Failed to delete the board: ${result.error.message}`
        );
      } else {
        console.log("Board deleted successfully");
        loadBoards();
      }
    } catch (error) {
      console.error("Error in handleDeleteBoard:", error);
      Alert.alert("Error", "Failed to delete the board. Please try again.");
    }
  };

  const handleLeaveBoard = async (boardId: number) => {
    try {
      console.log(`Attempting to leave board with ID: ${boardId}`);
      const result = await leaveBoard!(boardId.toString());
      console.log(`Leave board result:`, result);

      if (result.error) {
        console.error("Error leaving board:", result.error);
        Alert.alert(
          "Error",
          `Failed to leave the board: ${result.error.message}`
        );
      } else {
        console.log("Board left successfully");
        loadBoards();
      }
    } catch (error) {
      console.error("Error in handleLeaveBoard:", error);
      Alert.alert("Error", "Failed to leave the board. Please try again.");
    }
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    item: Board
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    if (item.canDelete) {
      return (
        <RectButton
          style={styles.deleteButton}
          onPress={() => handleDeleteBoard(item.id)}
        >
          <Animated.Text
            style={[
              styles.actionButtonText,
              {
                transform: [{ translateX: trans }],
              },
            ]}
          >
            Delete
          </Animated.Text>
        </RectButton>
      );
    } else {
      return (
        <RectButton
          style={styles.leaveButton}
          onPress={() => handleLeaveBoard(item.id)}
        >
          <Animated.Text
            style={[
              styles.actionButtonText,
              {
                transform: [{ translateX: trans }],
              },
            ]}
          >
            Leave
          </Animated.Text>
        </RectButton>
      );
    }
  };

  const ListItem = ({ item }: { item: Board }) => (
    <Swipeable
      renderRightActions={(progress, dragX) =>
        renderRightActions(progress, dragX, item)
      }
      rightThreshold={40}
    >
      <Link
        href={`/(authenticated)/board/${item.id}?bg=${encodeURIComponent(
          item.background
        )}`}
        style={styles.card}
        asChild
      >
        <TouchableOpacity>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.colorBlock,
                  { backgroundColor: item.background },
                ]}
              />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.grey} />
          </View>
        </TouchableOpacity>
      </Link>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => <DropdownPlus />,
        }}
      />
      <FlatList
        contentContainerStyle={styles.list}
        data={boards}
        keyExtractor={(item) => `${item.id}`}
        renderItem={ListItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadBoards} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F1F1",
  },
  list: {
    padding: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorBlock: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  separator: {
    height: 8,
  },
  deleteButton: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "flex-end",
    width: 100,
    height: "100%",
  },
  leaveButton: {
    backgroundColor: "blue",
    justifyContent: "center",
    alignItems: "flex-end",
    width: 100,
    height: "100%",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    padding: 20,
  },
});

export default Page;
