import { Colors } from "@/constants/Colors";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Octicons from "@expo/vector-icons/Octicons";
import { Image } from "react-native";
import { BlurView } from "expo-blur";
import PaymentsHeader from "@/components/CustomHeaders/PaymentsHeader";

const Layout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarBackground: () => (
          <BlurView
            intensity={100}
            tint={"extraLight"}
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.05)",
            }}
          />
        ),
        tabBarStyle: {
          backgroundColor: "transparent",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="boards"
        options={{
          headerShown: false,
          title: "Workspaces",
          tabBarIcon: ({ size, color, focused }) => (
            <Image
              style={{ width: size, height: size }}
              source={
                focused
                  ? require("@/assets/images/logo-icon-blue.png")
                  : require("@/assets/images/logo-icon-neutral.png")
              }
            />
          ),
        }}
      />
      <Tabs.Screen
        name="revolut"
        options={{
          title: "Account",

          tabBarIcon: ({ size, color }) => (
            <MaterialIcons name="account-balance" size={size} color={color} />
          ),
          header: () => <PaymentsHeader />,
          headerTransparent: true,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ size, color }) => (
            <Octicons name="arrow-switch" size={size} color={color} />
          ),
          header: () => <PaymentsHeader />,
          headerTransparent: true,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ size, color }) => (
            <FontAwesome name="user-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};
export default Layout;
