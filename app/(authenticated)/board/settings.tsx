import UserListItem from "@/components/User/UserListItem";
import { Colors } from "@/constants/Colors";
import { useSupabase } from "@/context/SupabaseContext";
import { Board, User } from "@/types/enums";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeInRight } from "react-native-reanimated";

const Page = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    getBoardInfo,
    updateBoard,
    deleteBoard,
    getBoardMember,
    updateBoardMembers,
  } = useSupabase();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [members, setMembers] = useState<User[]>([]);

  const loadInfo = async () => {
    if (!id) return;
    const [boardData, memberData] = await Promise.all([
      getBoardInfo!(id),
      getBoardMember!(id),
    ]);
    setBoard(boardData);
    // Remove duplicate members based on their id
    const uniqueMembers = memberData.filter(
      (member, index, self) =>
        index === self.findIndex((m) => m.id === member.id)
    );
    setMembers(uniqueMembers);
  };

  useEffect(() => {
    loadInfo();
  }, [id]);

  const handleBoardUpdate = async (updatedBoard: Partial<Board>) => {
    if (!board || !id) return;
    const newBoard = { ...board, ...updatedBoard };
    const updated = await updateBoard!(newBoard);
    setBoard(updated);
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteBoard!(id);
    router.back();
  };

  const deleteMember = async (memberId: string) => {
    if (!id) return;
    const updatedMembers = members.filter((member) => member.id !== memberId);
    setMembers(updatedMembers);

    try {
      await updateBoardMembers!(
        id,
        updatedMembers.map((member) => member.id)
      );
      // Optionally, you can show a success message here
    } catch (error) {
      console.error("Failed to update board members:", error);
      // Optionally, you can show an error message to the user
      // and revert the local state change
      setMembers(members);
    }
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

  const renderMemberItem = ({ item }: { item: User }) => (
    <Swipeable
      renderRightActions={(progress, dragX) =>
        renderRightActions(progress, dragX, () => deleteMember(item.id))
      }
      rightThreshold={40}
    >
      <UserListItem user={item} onPress={() => {}} selected={false} />
    </Swipeable>
  );
  const onUpdateBoard = async () => {
    const updated = await updateBoard!(board!);
    setBoard(updated);
  };
  if (!board) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Project Name</Text>
        <TextInput
          style={styles.input}
          value={board?.title}
          onChangeText={(e) => setBoard({ ...board!, title: e })}
          returnKeyType="done"
          enterKeyHint="done"
          onEndEditing={onUpdateBoard}
        />
      </View>

      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Members</Text>
        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.memberList}
        />
        <Link href={`/board/invite?id=${id}`} asChild>
          <TouchableOpacity style={styles.inviteButton}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.grey} />
            <Text style={styles.inviteButtonText}>Invite Members</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <TouchableOpacity onPress={onUpdateBoard} style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>Delete Project</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 4,
    padding: 8,
  },
  membersSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  memberList: {
    gap: 6,
    margin: 4,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  inviteButtonText: {
    marginLeft: 8,
    color: Colors.grey,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 16,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteBtn: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "red",
  },
  deleteBtnText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
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
});

export default Page;
