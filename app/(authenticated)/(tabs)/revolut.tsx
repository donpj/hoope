import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useSupabase } from "@/context/SupabaseContext"; // Import Supabase context
import { useAuth } from "@clerk/clerk-expo"; // Import Clerk's useAuth

// Function to call your Supabase Edge function that interacts with Revolut API
const fetchRevolutConsent = async (userId: string, sessionToken: string) => {
  try {
    const response = await fetch(
      "https://ewiemrelwtusaygzdcqm.supabase.co/functions/v1/revolut-oauth", // Your edge function URL
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`, // Auth token from Clerk
        },
        body: JSON.stringify({
          userId, // Pass userId dynamically here
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error Response Text:", errorText);
      throw new Error("Failed to fetch consent from Revolut");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Revolut consent:", error);
    throw error;
  }
};

export default function RevolutConsentScreen() {
  const { userId } = useSupabase(); // Fetch userId from your Supabase context
  const { getToken } = useAuth(); // Fetch session token from Clerk

  const [loading, setLoading] = useState(false);
  const [consentId, setConsentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchConsent = async () => {
    try {
      if (!userId) {
        setError("User not authenticated");
        return;
      }

      const sessionToken = await getToken({ template: "supabase" }); // Fetch session token
      setLoading(true);
      setError(null);

      const data = await fetchRevolutConsent(userId, sessionToken);

      if (data.success) {
        setConsentId(data.consentId);
      } else {
        setError("Failed to fetch consent from Revolut");
      }
    } catch (err) {
      setError(err.message || "Error occurred while fetching consent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Revolut Consent</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button title="Fetch Revolut Consent" onPress={handleFetchConsent} />
          {consentId && (
            <Text style={styles.successText}>Consent ID: {consentId}</Text>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  successText: {
    marginTop: 20,
    color: "green",
    fontSize: 16,
  },
  errorText: {
    marginTop: 20,
    color: "red",
    fontSize: 16,
  },
});
