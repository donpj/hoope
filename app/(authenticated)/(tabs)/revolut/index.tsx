import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import jwt from "jsonwebtoken";

export default function RevolutConsentScreen() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consentData, setConsentData] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState(null);

  useEffect(() => {
    if (authorizationUrl) {
      Linking.openURL(authorizationUrl).catch((err) =>
        console.error("An error occurred", err)
      );
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Revolut Consent</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Button title="Create Consent" onPress={handleCreateConsent} />
      )}
      {error && <Text style={styles.errorText}>Error: {error}</Text>}
      {consentData && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Consent Data:</Text>
          <Text style={styles.dataText}>
            {JSON.stringify(consentData, null, 2)}
          </Text>
        </View>
      )}
      {authorizationUrl && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Authorization URL:</Text>
          <Text style={styles.dataText}>{authorizationUrl}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  errorText: {
    color: "red",
    marginTop: 10,
  },
  dataContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  dataText: {
    fontSize: 14,
    textAlign: "center",
  },
});
