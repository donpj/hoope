import { Colors } from "@/constants/Colors";
import { Ionicons, Entypo } from "@expo/vector-icons";
import { View, Text, StyleSheet, Image } from "react-native";
import { TextInput, TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { client } from "@/utils/supabaseClient";
import { useAuth } from "@clerk/clerk-expo";

const PaymentsHeader = () => {
  const { top } = useSafeAreaInsets();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      if (isSignedIn && userId) {
        try {
          const { data, error } = await client
            .from("users")
            .select("avatar_url")
            .eq("id", userId)
            .single();

          if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        } catch (error) {
          console.error("Error in fetchUserData:", error);
        }
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, [userId, isSignedIn]);

  const handlePlusPress = () => {
    router.push("/payments/addBeneficiary");
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <BlurView intensity={80} tint={"extraLight"} style={{ paddingTop: top }}>
      <View
        style={[
          styles.container,
          {
            height: 60,
            gap: 10,
            paddingHorizontal: 20,
            backgroundColor: "transparent",
          },
        ]}
      >
        <Link href={"/(authenticated)/(tabs)/account"} asChild>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.gray,
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 40, height: 40 }}
              />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "500", fontSize: 16 }}>
                {userId ? userId.substring(0, 2).toUpperCase() : "?"}
              </Text>
            )}
          </TouchableOpacity>
        </Link>
        <View style={styles.searchSection}>
          <Ionicons
            style={styles.searchIcon}
            name="search"
            size={20}
            color={Colors.light.text}
          />
          <TextInput
            style={styles.input}
            placeholder="Search"
            placeholderTextColor={Colors.light.text}
          />
        </View>
        <View style={styles.circle}>
          <Entypo name={"calendar"} size={20} color={Colors.light.text} />
        </View>
        <TouchableOpacity style={styles.circle} onPress={handlePlusPress}>
          <Entypo name={"plus"} size={26} color={Colors.light.text} />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btn: {
    padding: 10,
    backgroundColor: Colors.gray,
  },
  searchSection: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: 30,
  },
  searchIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 0,
    backgroundColor: Colors.lightGray,
    color: Colors.light.text,
    borderRadius: 30,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
});
export default PaymentsHeader;
