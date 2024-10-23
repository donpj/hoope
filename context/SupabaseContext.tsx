import { createContext, useContext, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { Board, Task, TaskList } from "@/types/enums";
import { decode } from "base64-arraybuffer";
import {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from "@supabase/supabase-js";
import { client as supabase } from "@/utils/supabaseClient";

export const BOARDS_TABLE = "boards";
export const USER_BOARDS_TABLE = "user_boards";
export const LISTS_TABLE = "lists";
export const CARDS_TABLE = "cards";
export const USERS_TABLE = "users";
export const FILES_BUCKET = "files";

type ProviderProps = {
  userId: string | null;
  createBoard: (title: string, background: string) => Promise<any>;
  getBoards: () => Promise<any>;
  getBoardInfo: (boardId: string) => Promise<any>;
  updateBoard: (board: Board) => Promise<any>;
  deleteBoard: (id: string) => Promise<any>;
  getBoardLists: (boardId: string) => Promise<any>;
  addBoardList: (
    boardId: string,
    title: string,
    position?: number
  ) => Promise<any>;
  updateBoardList: (list: TaskList, newname: string) => Promise<any>;
  deleteBoardList: (id: string) => Promise<any>;
  getListCards: (listId: string) => Promise<any>;
  addListCard: (
    listId: string,
    boardId: string,
    title: string,
    position?: number,
    image_url?: string | null
  ) => Promise<any>;
  updateCard: (task: Task) => Promise<any>;
  assignCard: (cardId: string | number, userIds: string[]) => Promise<any>;
  deleteCard: (id: string) => Promise<any>;
  getCardInfo: (id: string) => Promise<any>;
  findUsers: (search: string) => Promise<any>;
  addUserToBoard: (boardId: string, userId: string) => Promise<any>;
  getBoardMember: (boardId: string) => Promise<any>;
  getRealtimeCardSubscription: (
    id: string,
    handleRealtimeChanges: (update: RealtimePostgresChangesPayload<any>) => void
  ) => any;
  uploadFile: (
    filePath: string,
    base64: string,
    contentType: string
  ) => Promise<string | undefined>;
  getFileFromPath: (path: string) => Promise<string | undefined>;
  setUserPushToken: (token: string) => Promise<any>;
  updateBoardMembers: (
    boardId: string,
    memberIdToRemove: string
  ) => Promise<any>;
  leaveBoard: (boardId: string) => Promise<any>;
  subscribeToCardChanges: (
    boardId: string,
    callback: (payload: any) => void
  ) => RealtimeChannel;
};

const SupabaseContext = createContext<Partial<ProviderProps>>({});

export function useSupabase() {
  return useContext(SupabaseContext);
}

export const SupabaseProvider = ({ children }: any) => {
  const { userId } = useAuth();

  useEffect(() => {
    setRealtimeAuth();
  }, []);

  const setRealtimeAuth = async () => {
    console.log("Setting realtime auth...");
    try {
      const clerkToken = await window.Clerk.session?.getToken({
        template: "supabase",
      });
      console.log("Clerk token obtained:", clerkToken ? "Yes" : "No");
      supabase.realtime.setAuth(clerkToken!);
      console.log("Realtime auth set successfully");
    } catch (error) {
      console.error("Error setting realtime auth:", error);
    }
  };

  const createBoard = async (title: string, background: string) => {
    const { data, error } = await supabase
      .from(BOARDS_TABLE)
      .insert({ title, creator: userId, background });

    if (error) {
      console.error("Error creating board:", error);
    }

    return data;
  };

  const getBoards = async () => {
    const { data, error } = await supabase
      .from(USER_BOARDS_TABLE)
      .select(`boards ( title, id, background, creator )`)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching boards:", error);
      return [];
    }

    const boards =
      data?.map((b: any) => ({
        ...b.boards,
        canDelete: b.boards.creator === userId,
      })) || [];

    console.log("Fetched boards:", boards);

    return boards;
  };

  const getBoardInfo = async (boardId: string) => {
    const { data } = await supabase
      .from(BOARDS_TABLE)
      .select(`*, users (first_name)`)
      .match({ id: boardId })
      .single();
    return data;
  };

  const updateBoard = async (board: Board) => {
    const { data } = await supabase
      .from(BOARDS_TABLE)
      .update({ title: board.title })
      .match({ id: board.id })
      .select("*")
      .single();

    return data;
  };

  const deleteBoard = async (id: string) => {
    console.log(`Attempting to delete board with ID: ${id}`);
    const { data, error } = await supabase
      .from(BOARDS_TABLE)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error in deleteBoard:", error);
      return { error };
    }

    if (data && data.length === 0) {
      return { error: { message: "Board not found" } };
    }

    return { data };
  };

  // CRUD Lists
  const getBoardLists = async (boardId: string) => {
    const lists = await supabase
      .from(LISTS_TABLE)
      .select("*")
      .eq("board_id", boardId)
      .order("position");

    return lists.data || [];
  };

  const addBoardList = async (boardId: string, title: string, position = 0) => {
    return await supabase
      .from(LISTS_TABLE)
      .insert({ board_id: boardId, position, title })
      .select("*")
      .single();
  };

  const updateBoardList = async (list: TaskList, newname: string) => {
    return await supabase
      .from(LISTS_TABLE)
      .update({
        title: newname,
      })
      .match({ id: list.id })
      .select("*")
      .single();
  };

  const deleteBoardList = async (id: string) => {
    return await supabase.from(LISTS_TABLE).delete().match({ id: id });
  };

  // CRUD Cards
  const addListCard = async (
    listId: string,
    boardId: string,
    title: string,
    position = 0,
    image_url: string | null = null
  ) => {
    return await supabase
      .from(CARDS_TABLE)
      .insert({
        board_id: boardId,
        list_id: listId,
        title,
        position,
        image_url,
      })
      .select("*")
      .single();
  };

  const getListCards = async (listId: string) => {
    const { data, error } = await supabase
      .from(CARDS_TABLE)
      .select(
        `
      *,
      card_assignments(
        user_id,
        users(id, first_name, email, avatar_url)
      )
    `
      )
      .eq("list_id", listId)
      .order("position");

    if (error) {
      console.error("Error fetching list cards:", error);
      return [];
    }

    return data.map((card) => ({
      ...card,
      assigned_users: card.card_assignments.map((ca) => ca.users),
    }));
  };

  const updateCard = async (card: any) => {
    console.log("SupabaseContext: Updating card:", card);

    try {
      const { data, error } = await supabase
        .from("cards")
        .update({
          title: card.title,
          description: card.description,
          start_date: card.start_date,
          end_date: card.end_date,
          currency: card.currency,
          amount: card.amount,
        })
        .eq("id", card.id)
        .select()
        .single();

      if (error) {
        console.error("SupabaseContext: Error updating card:", error);
        return { error };
      }

      console.log("SupabaseContext: Updated card data:", data);
      return { data };
    } catch (e) {
      console.error(
        "SupabaseContext: Exception caught while updating card:",
        e
      );
      return { error: e };
    }
  };

  const assignCard = async (cardId: string | number, userIds: string[]) => {
    console.log("Assigning card:", cardId, "to users:", userIds);

    try {
      // Get current assignments
      const { data: currentAssignments, error: fetchError } = await supabase
        .from("card_assignments")
        .select("user_id")
        .eq("card_id", cardId);

      if (fetchError) throw fetchError;

      const currentUserIds = currentAssignments.map((a) => a.user_id);
      const userIdsToAdd = userIds.filter((id) => !currentUserIds.includes(id));
      const userIdsToRemove = currentUserIds.filter(
        (id) => !userIds.includes(id)
      );

      // Add new assignments
      if (userIdsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("card_assignments")
          .insert(
            userIdsToAdd.map((userId) => ({ card_id: cardId, user_id: userId }))
          );

        if (insertError) throw insertError;
      }

      // Remove old assignments
      if (userIdsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("card_assignments")
          .delete()
          .eq("card_id", cardId)
          .in("user_id", userIdsToRemove);

        if (deleteError) throw deleteError;
      }

      // Fetch updated assignments
      const { data: updatedAssignments, error: selectError } = await supabase
        .from("card_assignments")
        .select("*, users(id, first_name, email, avatar_url)")
        .eq("card_id", cardId);

      if (selectError) throw selectError;

      return {
        data: updatedAssignments.map((a) => ({
          ...a,
          user: a.users,
        })),
        error: null,
      };
    } catch (error) {
      console.error("Error assigning users to card:", error);
      return { data: null, error };
    }
  };

  const deleteCard = async (id: string) => {
    return await supabase.from(CARDS_TABLE).delete().match({ id: id });
  };

  const getCardInfo = async (id: string) => {
    const { data, error } = await supabase
      .from(CARDS_TABLE)
      .select(
        `
        *,
        card_assignments(
          user_id,
          users(id, first_name, email, avatar_url)
        ),
        boards(*)
      `
      )
      .match({ id })
      .single();

    if (error) {
      console.error("Error fetching card info:", error);
      return null;
    }

    return {
      ...data,
      assigned_users: data.card_assignments.map((ca) => ca.users),
      start_date: data.start_date,
      end_date: data.end_date,
      currency: data.currency,
      amount: data.amount,
    };
  };

  const findUsers = async (search: string) => {
    console.log("Searching for users with email:", search);
    // Use the search_users stored procedure to find users by email
    const { data, error } = await supabase.rpc("search_users", {
      search: search,
    });
    console.log("Found errors:", data, error);
    return data;
  };

  const addUserToBoard = async (boardId: string, userId: string) => {
    return await supabase.from(USER_BOARDS_TABLE).insert({
      user_id: userId,
      board_id: boardId,
    });
  };

  const getBoardMember = async (boardId: string) => {
    const { data } = await supabase
      .from(USER_BOARDS_TABLE)
      .select("users(*)")
      .eq("board_id", boardId);

    const members = data?.map((b: any) => b.users);
    return members;
  };

  const getRealtimeCardSubscription = useCallback(
    (
      listId: number,
      callback: (payload: RealtimePostgresChangesPayload<any>) => void
    ) => {
      console.log(`Setting up realtime subscription for list ${listId}`);

      const channel = supabase
        .channel(`list_${listId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cards",
            filter: `list_id=eq.${listId}`,
          },
          (payload) => {
            console.log(
              `Received realtime update for list ${listId}:`,
              JSON.stringify(payload, null, 2)
            );
            callback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for list ${listId}:`, status);
        });

      console.log(`Channel created for list ${listId}:`, channel);
      return channel;
    },
    [supabase]
  );

  const uploadFile = async (
    filePath: string,
    base64: string,
    contentType: string
  ) => {
    const { data } = await supabase.storage
      .from(FILES_BUCKET)
      .upload(filePath, decode(base64), { contentType });

    return data?.path;
  };

  const getFileFromPath = async (path: string) => {
    const { data } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUrl(path, 60 * 60, {
        transform: {
          width: 300,
          height: 200,
        },
      });
    return data?.signedUrl;
  };

  const setUserPushToken = async (token: string) => {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .upsert({ id: userId, push_token: token });

    if (error) {
      console.error("Error setting push token:", error);
    }

    return data;
  };

  const updateBoardMembers = async (
    boardId: string,
    memberIdToRemove: string
  ) => {
    const { data, error } = await supabase
      .from(USER_BOARDS_TABLE)
      .delete()
      .match({ board_id: boardId, user_id: memberIdToRemove });

    if (error) {
      console.error("Error removing board member:", error);
      throw error;
    }

    return data;
  };

  const leaveBoard = async (boardId: string) => {
    const { data, error } = await supabase
      .from(USER_BOARDS_TABLE)
      .delete()
      .match({ board_id: boardId, user_id: userId });

    if (error) {
      console.error("Error in leaveBoard:", error);
      return { error };
    }

    return { data };
  };

  const subscribeToCardChanges = (
    boardId: string,
    callback: (payload: any) => void
  ) => {
    const channel = supabase
      .channel(`public:cards:board_id=eq.${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          console.log("Change received!", payload);
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  };

  const value = {
    userId,
    createBoard,
    getBoards,
    getBoardInfo,
    updateBoard,
    deleteBoard,
    getBoardLists,
    addBoardList,
    updateBoardList,
    deleteBoardList,
    getListCards,
    addListCard,
    updateCard,
    assignCard,
    deleteCard,
    getCardInfo,
    findUsers,
    addUserToBoard,
    getBoardMember,
    getRealtimeCardSubscription,
    uploadFile,
    getFileFromPath,
    setUserPushToken,
    updateBoardMembers,
    leaveBoard,
    subscribeToCardChanges,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};
