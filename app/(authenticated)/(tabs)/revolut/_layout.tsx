import { Colors } from "@/constants/Colors";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Stack, Tabs } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "react-native";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Revolut",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="modal"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="accounts"
        options={{
          title: "Payments",
          headerShown: false,
        }}
      />
    </Stack>
  );
};
export default Layout;

/*
   <Stack.Screen
        name="(authenticated)/(tabs)/revolut/callback"
        options={{
          title: "Payments",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(authenticated)/(tabs)/revolut/accounts"
        options={{
          title: "Payments",
          headerShown: false,
        }}
      />

*/
