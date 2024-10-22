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

export interface ListViewProps {
  taskList: TaskList;
  onDelete: () => void;
  onOpenModal: () => void;
}

const ListView = ({ taskList, onDelete, onOpenModal }: ListViewProps) => {
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

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["40%"], []);

  const [listName, setListName] = useState(taskList.title);

  useEffect(() => {
    loadListTasks();

    const subscription = getRealtimeCardSubscription!(
      taskList.id,
      handleRealtimeChanges
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [taskList.id]);

  const handleRealtimeChanges = (
    update: RealtimePostgresChangesPayload<any>
  ) => {
    console.log("REALTIME UPDATE:", update);
    const record = update.new?.id ? update.new : update.old;
    const event = update.eventType;

    if (!record) return;

    if (event === "INSERT") {
      setTasks((prev) => [...prev, record]);
    } else if (event === "UPDATE") {
      setTasks((prev) =>
        prev
          .map((task) => (task.id === record.id ? record : task))
          .filter((task) => !task.done)
          .sort((a, b) => a.position - b.position)
      );
    } else if (event === "DELETE") {
      setTasks((prev) => prev.filter((task) => task.id !== record.id));
    } else {
      console.log("Unhandled event", event);
    }
  };

  const loadListTasks = async () => {
    const data = await getListCards!(taskList.id);
    setTasks(data);
  };

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
      <View style={styles.listContainer}>
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
                <Ionicons name="add" size={14} color={Colors.primary} />
                <Text style={styles.addCardText}>Add card</Text>
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
    //backgroundColor: "transparent",
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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

    //borderRadius: 12,
    borderBottomColor: Colors.lightGray,
  },
  listTitle: {
    fontWeight: "600",
    fontSize: 18,
    color: Colors.light.text,
  },
  cardsContainer: {
    padding: 12,
  },
  flatListContainer: {
    maxHeight: "80%",
  },
  flatListContentContainer: {
    gap: 8,
    paddingBottom: 1, // Add some padding at the bottom of the list
  },
  inputContainer: {
    marginTop: 6, // Add space above the input
    //marginBottom: 8, // Add space below the input
  },
  input: {
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    color: Colors.light.text,
  },
  addCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
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
