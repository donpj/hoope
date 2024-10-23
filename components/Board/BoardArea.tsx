import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import ListStart from "@/components/Board/ListStart";
import ListView from "@/components/Board/ListView";
import { Colors } from "@/constants/Colors";
import { useSupabase } from "@/context/SupabaseContext";
import { Board, TaskList, TaskListFake } from "@/types/enums";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Button,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";

export interface BoardAreaProps {
  board?: Board;
}

const BoardArea = ({ board }: BoardAreaProps) => {
  const { width, height } = useWindowDimensions();
  const { getBoardLists, addBoardList, updateBoardList, deleteBoardList } =
    useSupabase();
  const [startListActive, setStartListActive] = useState(false);
  const scrollOffsetValue = useSharedValue<number>(0);
  const [data, setData] = useState<Array<TaskList | TaskListFake>>([
    { id: undefined },
  ]);
  const ref = useRef<ICarouselInstance>(null);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // New state for modal
  const [activeList, setActiveList] = useState<TaskList | null>(null);
  const [listName, setListName] = useState("");

  const handleListNameChange = useCallback((text: string) => {
    setListName(text);
  }, []);

  useEffect(() => {
    loadBoardLists();
  }, []);

  const loadBoardLists = async () => {
    if (!board) return;
    const lists = await getBoardLists!(board.id);
    setData([...lists, { id: undefined }]);
  };

  const onSaveNewList = async (title: string) => {
    setStartListActive(false);
    const { data: newItem } = await addBoardList!(board!.id, title);
    data.pop();
    setData([...data, newItem, { id: undefined }]);
  };

  const onListDeleted = async (id: string) => {
    await deleteBoardList!(id);
    setData(data.filter((item) => item.id !== id));
    bottomSheetModalRef.current?.close();
  };

  const handleOpenModal = (list: TaskList) => {
    setActiveList(list);
    setListName(list.title);
    bottomSheetModalRef.current?.present();
  };

  const handleCloseModal = () => {
    bottomSheetModalRef.current?.close();
    setActiveList(null);
  };

  const handleUpdateList = async () => {
    if (activeList && board) {
      const updatedList = await updateBoardList!(activeList.id, listName);
      setData(
        data.map((item) =>
          item.id === activeList.id ? { ...item, title: listName } : item
        )
      );
      bottomSheetModalRef.current?.close();
    }
  };

  const ITEM_WIDTH = width * 0.98;

  return (
    <BottomSheetModalProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: board?.background }]}
        edges={["bottom"]}
      >
        <Carousel
          width={width}
          height={height}
          style={styles.carousel}
          loop={false}
          ref={ref}
          defaultScrollOffsetValue={scrollOffsetValue}
          data={data}
          renderItem={({ index, item }: any) => (
            <View style={[styles.cardContainer, { width: ITEM_WIDTH }]}>
              {item.id && (
                <ListView
                  key={index}
                  maxHeight={height * 0.6}
                  taskList={item}
                  onDelete={() => onListDeleted(item.id)}
                  onOpenModal={() => handleOpenModal(item)}
                />
              )}
              {item.id === undefined && (
                <View style={styles.addListContainer}>
                  {!startListActive && (
                    <TouchableOpacity
                      onPress={() => setStartListActive(true)}
                      style={styles.listAddBtn}
                    >
                      <Text style={styles.listAddBtnText}>Add list</Text>
                    </TouchableOpacity>
                  )}
                  {startListActive && (
                    <ListStart
                      onCancel={() => setStartListActive(false)}
                      onSave={onSaveNewList}
                    />
                  )}
                </View>
              )}
            </View>
          )}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.95,
            parallaxScrollingOffset: 30,
          }}
          snapEnabled={true}
          panGestureHandlerProps={{
            activeOffsetX: [-10, 10],
          }}
        />
        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={["40%"]}
          enableOverDrag={false}
          enablePanDownToClose
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Button title="Cancel" onPress={handleCloseModal} />
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>List name</Text>
              <BottomSheetTextInput
                style={styles.modalInput}
                value={listName}
                onChangeText={handleListNameChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={handleUpdateList}
            >
              <Text>Update List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => activeList && onListDeleted(activeList.id)}
            >
              <Text>Delete List</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetModal>
      </SafeAreaView>
    </BottomSheetModalProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  carousel: {
    flex: 1,
  },
  cardContainer: {
    height: "100%",
    paddingHorizontal: 0,
    //paddingVertical: 15,

    borderRadius: 12,
  },
  addListContainer: {
    paddingTop: 20,
  },
  listAddBtn: {
    backgroundColor: "#00000047",
    height: 44,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  listAddBtnText: {
    color: Colors.fontLight,
    fontSize: 18,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  updateBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 8,
  },
  deleteBtn: {
    backgroundColor: Colors.error,
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
  },
});

export default BoardArea;
