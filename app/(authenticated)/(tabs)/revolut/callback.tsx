import React, { useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

export default function RevolutCallback() {
  const { code } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (code) {
      exchangeCodeForToken(code as string);
    }
  }, [code]);

  const exchangeCodeForToken = async (authCode: string) => {
    try {
      const response = await fetch(`${API_URL}/revolut-exchange-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authCode }),
      });

      if (!response.ok) {
        throw new Error("Failed to exchange code for token");
      }

      const data = await response.json();
      console.log("Access Token:", data.access_token);

      await getAccounts(data.access_token);
    } catch (error) {
      console.error("Error exchanging code for token:", error);
    }
  };

  const getAccounts = async (accessToken: string) => {
    try {
      const response = await fetch(`${API_URL}/revolut-get-accounts`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get accounts");
      }

      const data = await response.json();
      console.log("Accounts:", data);

      // Handle the account data here
      // For example, you might want to store it in your app's state or navigate to a new screen
      router.push({
        pathname: "/(authenticated)/(tabs)/revolut/accounts",
        params: { accounts: JSON.stringify(data) },
      });
    } catch (error) {
      console.error("Error getting accounts:", error);
    }
  };

  return (
    <View>
      <Text>Processing Revolut authorization...</Text>
    </View>
  );
}
