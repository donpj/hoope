import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Button,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";

export default function RevolutConsentScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consentData, setConsentData] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState(null);
  const [accounts, setAccounts] = useState(null);

  const handleDeepLink = useCallback((event) => {
    console.log("Full received URL:", event.url);
    let url = event.url;

    // Check if the URL contains a '#' and replace it with '?'
    if (url.includes("#")) {
      url = url.replace("#", "?");
    }

    const parsedUrl = new URL(url);
    const code = parsedUrl.searchParams.get("code");
    const state = parsedUrl.searchParams.get("state");
    const idToken = parsedUrl.searchParams.get("id_token");

    console.log(
      "Extracted - code:",
      code,
      "state:",
      state,
      "id_token:",
      idToken
    );

    if (code) {
      fetchAccounts(code);
    } else {
      console.error("Authorization code is missing in the URL");
      setError("Authorization code is missing. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (authorizationUrl) {
      WebBrowser.openAuthSessionAsync(authorizationUrl, "yourapp://callback")
        .then((result) => {
          if (result.type === "success" && result.url) {
            handleDeepLink({ url: result.url });
          }
        })
        .catch((err) => console.error("An error occurred", err));
    }
  }, [authorizationUrl]);

  const handleCreateConsent = async () => {
    setLoading(true);
    setError(null);
    setConsentData(null);
    setAuthorizationUrl(null);

    try {
      const token = await getToken({ template: "supabase" });
      console.log("Retrieved Token:", token);

      if (!token) {
        throw new Error("Failed to get session token");
      }

      console.log("Sending request to backend...");
      const response = await fetch("/api/revolut-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        JSON.stringify(Array.from(response.headers.entries()))
      );

      const responseText = await response.text();
      console.log("Response body:", responseText);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${responseText}`
        );
      }

      const data = JSON.parse(responseText);
      setConsentData(data.consentData);
      setAuthorizationUrl(data.authorizationUrl);
      console.log("Consent Data:", data.consentData);
      console.log("Authorization URL:", data.authorizationUrl);
    } catch (error) {
      console.error("Error creating consent:", error);
      setError(error.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (code: string) => {
    try {
      setLoading(true);
      const token = await getToken({ template: "supabase" });

      // Exchange the code for an access token
      const tokenResponse = await fetch("/api/revolut-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to exchange code for token: ${tokenResponse.status}`
        );
      }

      const { access_token } = await tokenResponse.json();

      // Use the access token to fetch accounts
      const accountsResponse = await fetch("/api/revolut-accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Revolut-Access-Token": access_token,
        },
      });

      if (!accountsResponse.ok) {
        throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
      }

      const accountsData = await accountsResponse.json();
      console.log(
        "Fetched accounts data:",
        JSON.stringify(accountsData, null, 2)
      );

      if (
        accountsData &&
        accountsData.Data &&
        Array.isArray(accountsData.Data.Account)
      ) {
        setAccounts(accountsData);
      } else {
        console.error("Unexpected account data structure:", accountsData);
        setError("Unexpected account data structure");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToPayments = () => {
    if (consentData && consentData.Data && consentData.Data.ConsentId) {
      router.push({
        pathname: "/(authenticated)/(tabs)/revolut/payments",
        params: {
          consentId: consentData.Data.ConsentId,
          accountDetails: JSON.stringify(accounts.Data.Account[0]), // Passing the first account for simplicity
        },
      });
    } else {
      setError("Consent data is not available. Please create consent first.");
    }
  };

  const renderAccount = ({ item }) => (
    <View style={styles.accountItem}>
      <Text style={styles.accountName}>
        {item.Nickname || item.AccountId || "N/A"}
      </Text>
      <Text>Account ID: {item.AccountId || "N/A"}</Text>
      <Text>Currency: {item.Currency || "N/A"}</Text>
      <Text>Account Type: {item.AccountType || "N/A"}</Text>
      <Text>Account Sub Type: {item.AccountSubType || "N/A"}</Text>
      <Text>Nickname: {item.Nickname || "N/A"}</Text>
      {item.Account && item.Account.length > 0 && (
        <View style={styles.accountDetails}>
          <Text style={styles.subHeader}>Account Details:</Text>
          <Text>Scheme Name: {item.Account[0].SchemeName || "N/A"}</Text>
          <Text>Identification: {item.Account[0].Identification || "N/A"}</Text>
          <Text>Name: {item.Account[0].Name || "N/A"}</Text>
          <Text>
            Secondary Identification:{" "}
            {item.Account[0].SecondaryIdentification || "N/A"}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {!consentData && (
          <Button
            title="Connect Revolut Account"
            onPress={handleCreateConsent}
          />
        )}
        {loading && <ActivityIndicator size="large" />}
        {error && <Text style={styles.error}>Error: {error}</Text>}
        {consentData && (
          <View>
            <Text style={styles.title}>Login Details:</Text>
            <Text>
              Phone Number: <Text selectable={true}>7208764550</Text>
            </Text>
            <Text>Pin: 0000</Text>
          </View>
        )}
        {accounts && accounts.Data && accounts.Data.Account ? (
          <FlatList
            data={accounts.Data.Account}
            renderItem={renderAccount}
            keyExtractor={(item) => item.AccountId}
            ListHeaderComponent={
              <View>
                <Text style={styles.title}>Your Revolut Accounts</Text>
                <Text>Total Pages: {accounts.Meta?.TotalPages || "N/A"}</Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.buttonContainer}>
                <Button
                  title="Go to Payments"
                  onPress={handleNavigateToPayments}
                />
              </View>
            }
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white", // or any color that matches your app's theme
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100, // Add extra padding at the bottom
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  accountItem: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  accountDetails: {
    marginTop: 10,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  error: {
    color: "red",
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40, // Add extra margin at the bottom
  },
});
