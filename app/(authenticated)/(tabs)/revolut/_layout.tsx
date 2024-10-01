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
        }}
      />
      <Stack.Screen
        name="RevolutAuthenticationScreen"
        options={{
          title: "Payments",
          headerShown: false,
        }}
      />
    </Stack>
  );
};
export default Layout;
