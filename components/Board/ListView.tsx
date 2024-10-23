import React from "react";
import { Colors } from "@/constants/Colors";
import { useSupabase } from "@/context/SupabaseContext";
import { Task, TaskList } from "@/types/enums";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import DraggableFlatList, {
  DragEndParams,
} from "react-native-draggable-flatlist";
import * as Haptics from "expo-haptics";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import ListItem from "@/components/Board/ListItem";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useFocusEffect } from "@react-navigation/native";

export interface ListViewProps {
  taskList: TaskList;
  onDelete: () => void;
  onOpenModal: () => void;
  maxHeight: number;
}

const ListView: React.FC<ListViewProps> = ({
  taskList,
  onDelete,
  onOpenModal,
  maxHeight,
}) => {
  const {
    getListCards,
    addListCard,
    updateCard,
    deleteBoardList,
    updateBoardList,
    getRealtimeCardSubscription,
  } = useSupabase();
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["40%"], []);

  const [listName, setListName] = useState(taskList.title);

  const loadListTasks = useCallback(async () => {
    const data = await getListCards!(taskList.id);
    setTasks(data);
  }, [getListCards, taskList.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadListTasks();
    setRefreshing(false);
  }, [loadListTasks]);

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  useEffect(() => {
    console.log("Setting up real-time subscription for list:", taskList.id);
    let subscription: RealtimeChannel;

    try {
      subscription = getRealtimeCardSubscription!(
        taskList.id,
        handleRealtimeChanges
      );
      console.log("Subscription created successfully:", subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
    }

    return () => {
      console.log("Cleaning up real-time subscription for list:", taskList.id);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [taskList.id]);

  const handleRealtimeChanges = useCallback(
    (update: RealtimePostgresChangesPayload<any>) => {
      console.log("Received real-time update:", update);
      loadListTasks();
    },
    [loadListTasks]
  );

  const onDeleteList = async () => {
    await deleteBoardList!(taskList.id);
    bottomSheetModalRef.current?.close();
    onDelete();
  };

  const onUpdateTaskList = async () => {
    await updateBoardList!(taskList, listName);
  };

  const onAddCard = async () => {
    const { data, error } = await addListCard!(
      taskList.id,
      taskList.board_id,
      newTask,
      tasks.length
    );
    if (!error) {
      setIsAdding(false);
      setNewTask("");
    }
  };

  const onTaskDropped = async (params: DragEndParams<Task>) => {
    const newData = params.data.map((item: any, index: number) => ({
      ...item,
      position: index,
    }));

    setTasks(newData);
    newData.forEach(async (item: any) => {
      await updateCard!(item);
    });
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        opacity={0.2}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        {...props}
        onPress={() => bottomSheetModalRef.current?.close()}
      />
    ),
    []
  );

  return (
    <BottomSheetModalProvider>
      <View style={[styles.listContainer, { maxHeight }]}>
        <View style={styles.listNameContainer}>
          <Text style={styles.listTitle}>{taskList.title}</Text>
          <TouchableOpacity onPress={onOpenModal}>
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={22}
              color={Colors.gray}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardsContainer}>
          <DraggableFlatList
            data={tasks}
            renderItem={ListItem}
            keyExtractor={(item) => `${item.id}`}
            onDragEnd={onTaskDropped}
            onDragBegin={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            onPlaceholderIndexChange={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
            activationDistance={10}
            containerStyle={styles.flatListContainer}
            contentContainerStyle={styles.flatListContentContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
          {isAdding && (
            <View style={styles.inputContainer}>
              <TextInput
                autoFocus
                style={styles.input}
                value={newTask}
                onChangeText={setNewTask}
                placeholder="Enter new task"
                placeholderTextColor={Colors.gray}
              />
            </View>
          )}

          <View style={styles.addCardContainer}>
            {!isAdding ? (
              <TouchableOpacity
                style={styles.addCardButton}
                onPress={() => setIsAdding(true)}
              >
                <Ionicons name="add" size={14} color={Colors.fontDark} />
                <Text style={styles.addCardText}>Add Job</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={() => setIsAdding(false)}>
                  <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onAddCard}>
                  <Text style={styles.addButton}>Add</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </BottomSheetModalProvider>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    //flex: 1,
    //backgroundColor: "transparent",
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 16,
    //marginLeft: 8,
    /*
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    */
  },
  listNameContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 15,
    borderBottomWidth: 1,
    //backgroundColor: Colors.white,
    paddingTop: 12,
    paddingBottom: 12,

    borderRadius: 12,
    borderBottomColor: Colors.lightGray,
  },
  listTitle: {
    fontWeight: "600",
    fontSize: 18,
    color: Colors.light.text,
  },
  cardsContainer: {
    padding: 0,
    paddingTop: 10,
    paddingBottom: 10,
    //flex: 1,
  },
  flatListContainer: {
    //maxHeight: "80%",
  },
  flatListContentContainer: {
    gap: 2,
    //paddingBottom: 1, // Add some padding at the bottom of the list
  },
  inputContainer: {
    marginTop: 6, // Add space above the input
    paddingHorizontal: 12,
    //marginBottom: 8, // Add space below the input
  },
  input: {
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 8,
    //borderWidth: 1,
    borderColor: Colors.lightGray,
    color: Colors.light.text,
  },
  addCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 15,
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  addCardText: {
    //color: Colors.primary,
    fontSize: 14,
    marginLeft: 4,
  },
  cancelButton: {
    color: Colors.gray,
    fontSize: 14,
  },
  addButton: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ListView;
