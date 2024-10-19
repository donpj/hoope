import { Colors } from "@/constants/Colors";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "react-native";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="transfers"
        options={{
          title: "Transfers",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="addBeneficiary"
        options={{
          title: "",
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
};

export default Layout;
