import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSupabase } from "@/context/SupabaseContext";
import { Colors } from "@/constants/Colors";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import UserAvatar from "@/components/User/UserAvatar";
import UserListItem from "@/components/User/UserListItem";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { RectButton } from "react-native-gesture-handler";
import Animated, { FadeInRight } from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import { en, registerTranslation } from "react-native-paper-dates";
import { useHeaderHeight } from "@react-navigation/elements";

registerTranslation("en", en);

const Page = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCardInfo, getBoardMember, updateCard, assignCard } = useSupabase();
  const router = useRouter();
  const [card, setCard] = useState<any>(null);
  const [member, setMember] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [visibleTime, setVisibleTime] = useState(false);
  const [openStartDate, setOpenStartDate] = useState(false);
  const [openEndDate, setOpenEndDate] = useState(false);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["60%"], []);

  useEffect(() => {
    if (!id) return;
    loadInfo();
  }, [id]);

  const loadInfo = async () => {
    if (!id) return;
    const data = await getCardInfo!(id);
    setCard(data);
    setSelectedUsers(data.assigned_users || []);
    setStartDate(data.start_date ? new Date(data.start_date) : undefined);
    setEndDate(data.end_date ? new Date(data.end_date) : undefined);
    setCurrency(data.currency || "");
    setAmount(data.amount ? data.amount.toString() : "");

    const boardMembers = await getBoardMember!(data.board_id);
    setMember(boardMembers);
  };

  const handleSaveChanges = async () => {
    if (!card) return;

    const updatedCard = {
      id: card.id,
      title: card.title,
      description: card.description,
      start_date: startDate?.toISOString(),
      end_date: endDate?.toISOString(),
      currency: currency,
      amount: parseFloat(amount) || 0,
    };

    const { error } = await updateCard!(updatedCard);
    if (error) {
      console.error("Failed to update card:", error);
      // Handle error (e.g., show an alert)
    } else {
      console.log("Card updated successfully");

      // Update assigned users separately
      if (selectedUsers && selectedUsers.length > 0) {
        const { error: assignError } = await assignCard!(
          card.id,
          selectedUsers.map((user) => user.id)
        );

        if (assignError) {
          console.error("Failed to update assigned users:", assignError);
          // Handle error (e.g., show an alert)
        } else {
          console.log("Assigned users updated successfully");
        }
      }

      // Navigate back to the boards page
      router.back();
    }
  };

  const onAssignUsers = async () => {
    const { data, error } = await assignCard!(
      card.id,
      selectedUsers.map((u) => u.id)
    );

    if (error) {
      console.error("Error assigning users:", error);
      return;
    }

    setCard((prevCard) => ({
      ...prevCard,
      assigned_users: selectedUsers,
    }));
    bottomSheetModalRef.current?.close();
  };

  const toggleUserSelection = (user: any) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        {...props}
      />
    ),
    []
  );

  const handleCloseModal = () => {
    bottomSheetModalRef.current?.close();
  };

  const renderRightActions = (
    progress: any,
    dragX: any,
    onDelete: () => void
  ) => {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
        <Animated.Text
          entering={FadeInRight.duration(300)}
          style={styles.deleteActionText}
        >
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const renderAssignedUser = ({ item }: { item: any }) => (
    <Swipeable
      renderRightActions={(progress, dragX) =>
        renderRightActions(progress, dragX, () => removeAssignedUser(item.id))
      }
      rightThreshold={40}
    >
      <View style={styles.assignedUserItem}>
        <UserListItem user={item} onPress={() => {}} selected={false} />
      </View>
    </Swipeable>
  );

  const removeAssignedUser = async (userId: string) => {
    console.log("Removing user:", userId, "from card:", card.id);

    const updatedUsers = selectedUsers.filter((user) => user.id !== userId);

    try {
      const { data, error } = await assignCard!(
        card.id,
        updatedUsers.map((u) => u.id)
      );

      if (error) throw error;

      // Update local state
      setSelectedUsers(updatedUsers);
      setCard((prevCard) => ({
        ...prevCard,
        assigned_users: data || [],
      }));

      console.log("User removed successfully");
    } catch (error) {
      console.error("Error removing assigned user:", error);
      // You might want to show an error message to the user here
      // Alert.alert("Error", "Failed to remove user. Please try again.");
    }
  };

  const onDismissStart = () => setOpenStartDate(false);
  const onConfirmStart = ({ date }: { date?: Date }) => {
    setOpenStartDate(false);
    if (date) setStartDate(date);
  };

  const onDismissEnd = () => setOpenEndDate(false);
  const onConfirmEnd = ({ date }: { date?: Date }) => {
    setOpenEndDate(false);
    if (date) setEndDate(date);
  };

  const formatDate = (date: Date | undefined) => {
    return date ? date.toLocaleDateString() : "Select Date";
  };

  if (!card) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }
  const headerHeight = useHeaderHeight();

  return (
    <BottomSheetModalProvider>
      <ScrollView style={[styles.container, { paddingTop: headerHeight }]}>
        <Text style={styles.sectionTitle}>Job Name:</Text>
        <TextInput
          style={styles.input}
          value={card.title}
          onChangeText={(text) => setCard({ ...card, title: text })}
          placeholder="Card Title"
        />
        <Text style={styles.sectionTitle}>Job Description:</Text>
        <TextInput
          style={[styles.input, styles.jobDescription]}
          value={card.description}
          onChangeText={(text) => setCard({ ...card, description: text })}
          placeholder="Enter job description"
          multiline
        />

        <View style={styles.dateRow}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Start:</Text>
            <TouchableOpacity
              onPress={() => setOpenStartDate(true)}
              style={styles.dateButton}
            >
              <Text>{formatDate(startDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>End:</Text>
            <TouchableOpacity
              onPress={() => setOpenEndDate(true)}
              style={styles.dateButton}
            >
              <Text>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Currency:</Text>
        <TextInput
          style={styles.input}
          value={currency}
          onChangeText={setCurrency}
          placeholder="Enter currency"
        />

        <Text style={styles.sectionTitle}>Amount:</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter amount"
          keyboardType="numeric"
        />

        <View style={styles.assignedUsersSection}>
          <Text style={styles.sectionTitle}>Assigned Users:</Text>
          {selectedUsers && selectedUsers.length > 0 ? (
            <FlatList
              data={selectedUsers}
              renderItem={renderAssignedUser}
              keyExtractor={(item) => item.id}
              horizontal={false}
              scrollEnabled={false}
            />
          ) : (
            <Text>No users assigned</Text>
          )}
          <TouchableOpacity
            style={styles.addUserButton}
            onPress={() => bottomSheetModalRef.current?.present()}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.grey} />
            <Text style={styles.addUserText}>Add User</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={openStartDate}
        onDismiss={onDismissStart}
        date={startDate}
        onConfirm={onConfirmStart}
      />

      <DatePickerModal
        locale="en"
        mode="single"
        visible={openEndDate}
        onDismiss={onDismissEnd}
        date={endDate}
        onConfirm={onConfirmEnd}
      />

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
      >
        <View style={styles.bottomSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Users</Text>
            <TouchableOpacity
              onPress={() => bottomSheetModalRef.current?.close()}
            >
              <Ionicons name="close" size={24} color={Colors.grey} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={member}
            renderItem={({ item }) => (
              <UserListItem
                user={item}
                onPress={() => toggleUserSelection(item)}
                selected={selectedUsers.some((u) => u.id === item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
          />
          <TouchableOpacity style={styles.assignButton} onPress={onAssignUsers}>
            <Text style={styles.assignButtonText}>Assign Users</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  description: {
    height: 100,
    textAlignVertical: "top",
  },
  assignedUsersSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  assignedUserItem: {
    marginBottom: 8,
  },
  addUserButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addUserText: {
    marginLeft: 8,
    color: Colors.grey,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomSheet: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  assignButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 16,
  },
  assignButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  rightAction: {
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#dd2c00",
    flex: 1,
    justifyContent: "flex-end",
  },
  actionText: {
    color: "white",
    fontSize: 16,
    backgroundColor: "transparent",
    padding: 10,
  },
  deleteAction: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "flex-end",
    width: 100,
    height: "100%",
  },
  deleteActionText: {
    color: "white",
    fontWeight: "600",
    padding: 20,
  },
  jobDescription: {
    height: 200,
    textAlignVertical: "top",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  dateButton: {
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
});

export default Page;
