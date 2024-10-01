import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { View, ActivityIndicator, Linking } from "react-native";
import { Colors } from "@/constants/Colors";
import { SupabaseProvider } from "@/context/SupabaseContext";
import { DefaultTheme } from "@react-navigation/native";

const CLERK_PUBLISHABLE_KEY = process.env
  .EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;

// Cache the Clerk JWT
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const InitialLayout = () => {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(authenticated)";

    if (isSignedIn && !inAuthGroup) {
      router.replace("/(authenticated)/(tabs)/boards");
    } else if (!isSignedIn) {
      router.replace("/");
    }
  }, [isSignedIn]);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url.includes("revolut.com/app/YOUR_CLIENT_ID")) {
        const code = new URL(url).searchParams.get("code");
        console.log("Received authorization code:", code);
        // Handle the authorization code here
        // For example, you might want to navigate to a specific screen:
        if (isSignedIn) {
          router.push({
            pathname: "/(authenticated)/(tabs)/revolut/callback",
            params: { code },
          });
        }
      }
    };

    // Use addListener instead of addEventListener
    const subscription = Linking.addEventListener("url", handleDeepLink);
    // Check for initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      // Use remove() method to clean up the listener
      subscription.remove();
    };
  }, [isSignedIn, router]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SupabaseProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{ title: "", headerShown: false }}
        />
        <Stack.Screen name="(authenticated)" options={{ headerShown: false }} />
        <Stack.Screen
          name="authentication/login"
          options={{
            //presentation: "Workspaces",
            title: "Login",
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: DefaultTheme.colors.background,
            },
          }}
        />
        <Stack.Screen
          name="authentication/register"
          options={{
            //presentation: "Workspaces",
            title: "Sign Up",
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: DefaultTheme.colors.background,
            },
          }}
        />
        <Stack.Screen
          name="authentication/reset"
          options={{
            //presentation: "Workspaces",
            title: "Reset Password",
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: DefaultTheme.colors.background,
            },
          }}
        />
        <Stack.Screen
          name="(authenticated)/(tabs)/revolut/callback"
          options={{
            title: "Revolut Callback",
            headerShown: false,
          }}
        />
      </Stack>
    </SupabaseProvider>
  );
};

const RootLayoutNav = () => {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <StatusBar style="light" />
      <ActionSheetProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <InitialLayout />
        </GestureHandlerRootView>
      </ActionSheetProvider>
    </ClerkProvider>
  );
};
export default RootLayoutNav;
