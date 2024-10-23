import { useSupabase } from "@/context/SupabaseContext";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { useState, useEffect } from "react";
import { DefaultTheme } from "@react-navigation/native";
import { User } from "@/types/enums";
import { useHeaderHeight } from "@react-navigation/elements";
import UserListItem from "@/components/User/UserListItem";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const Page = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { findUsers, addUserToBoard } = useSupabase();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userList, setUserList] = useState<User[]>([]);
  const headerHeight = useHeaderHeight();

  const onSearchUser = async (searchText: string) => {
    setSearch(searchText);
    if (searchText.length > 0) {
      console.log("Searching for:", searchText);
      const data = await findUsers!(searchText);
      console.log("Search results:", data);
      setUserList(data);
    } else {
      setUserList([]);
    }
  };

  const onAddUser = async (user: User) => {
    console.log("Adding user:", user);
    await addUserToBoard!(id!, user.id);
    await router.dismiss();
  };

  useEffect(() => {
    console.log(
      "Rendering invite page, search:",
      search,
      "userList length:",
      userList.length
    );
  }, [search, userList]);

  const renderUserItem = ({ item }: { item: User }) => (
    <UserListItem
      user={item}
      onPress={() => onAddUser(item)}
      selected={false}
    />
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: DefaultTheme.colors.background,
          },
          title: "Invite Members",
        }}
      />
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={Colors.grey}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Invite by name, username or email"
          value={search}
          onChangeText={onSearchUser}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={userList}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderUserItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No users found. Try a different search.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    gap: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: Colors.grey,
  },
});

export default Page;
