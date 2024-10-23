import { Colors } from "@/constants/Colors";
import { useSupabase } from "@/context/SupabaseContext";
import { Board } from "@/types/enums";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BoardArea from "@/components/Board/BoardArea";
import { useHeaderHeight } from "@react-navigation/elements";
import { RealtimeChannel } from "@supabase/supabase-js";

const Page = () => {
  const { id, bg } = useLocalSearchParams<{ id: string; bg?: string }>();
  const { getBoardInfo, getBoardLists, subscribeToCardChanges } = useSupabase();
  const [board, setBoard] = useState<Board>();
  const [lists, setLists] = useState<any[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    if (!id) return;
    loadBoardInfo();
    loadLists();
    const newChannel = subscribeToCardChanges!(id, handleRealtimeCardChange);
    setChannel(newChannel);

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [id]);

  const loadBoardInfo = async () => {
    if (!id) return;

    const data = await getBoardInfo!(id);
    setBoard(data);
  };

  const loadLists = async () => {
    if (!id) return;
    const data = await getBoardLists!(id);
    setLists(data);
  };

  const handleRealtimeCardChange = (payload: any) => {
    console.log("Realtime card change:", payload);
    if (payload.eventType === "INSERT") {
      // A new card was added
      const newCard = payload.new;
      setLists((currentLists) =>
        currentLists.map((list) =>
          list.id === newCard.list_id
            ? { ...list, cards: [...(list.cards || []), newCard] }
            : list
        )
      );
    } else if (payload.eventType === "DELETE") {
      // A card was deleted
      const deletedCard = payload.old;
      setLists((currentLists) =>
        currentLists.map((list) =>
          list.id === deletedCard.list_id
            ? {
                ...list,
                cards: (list.cards || []).filter(
                  (card) => card.id !== deletedCard.id
                ),
              }
            : list
        )
      );
    } else if (payload.eventType === "UPDATE") {
      // A card was updated
      const updatedCard = payload.new;
      setLists((currentLists) =>
        currentLists.map((list) =>
          list.id === updatedCard.list_id
            ? {
                ...list,
                cards: (list.cards || []).map((card) =>
                  card.id === updatedCard.id ? updatedCard : card
                ),
              }
            : list
        )
      );
    }
  };

  const CustomHeader = () => (
    <BlurView intensity={80} tint="dark" style={{ paddingTop: top }}>
      <View style={[styles.headerContainer]}>
        <TouchableOpacity
          onPress={() => {
            router.dismiss();
          }}
        >
          <Ionicons name="close" size={24} color={Colors.fontLight} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ color: Colors.fontLight, fontSize: 16 }}>
            {board?.title}
          </Text>
          <Text style={{ color: Colors.fontLight, fontSize: 12 }}>
            Workspace of {(board as any)?.users.first_name}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons
              name="filter-circle-outline"
              size={26}
              color={Colors.fontLight}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons
              name="notifications-outline"
              size={26}
              color={Colors.fontLight}
            />
          </TouchableOpacity>
          <Link href={`/(authenticated)/board/settings?id=${id}`} asChild>
            <TouchableOpacity>
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={26}
                color={Colors.fontLight}
              />
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </BlurView>
  );

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingTop: headerHeight,
        flex: 1,
      }}
    >
      <Stack.Screen
        options={{
          title: board?.title,
          headerTransparent: true,
          header: () => <CustomHeader />,
        }}
      />
      {board && <BoardArea board={board} />}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "",
    paddingHorizontal: 14,
    height: 50,
  },
});
export default Page;
