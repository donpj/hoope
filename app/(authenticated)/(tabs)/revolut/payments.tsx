import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";

const API_BASE_URL = process.env.REVOLUT_API_URL || "https://api.hoope.co";

export default function RevolutPaymentScreen() {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consentId, setConsentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState(null);
  const [domesticPaymentId, setDomesticPaymentId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  const { getToken } = useAuth();
  const router = useRouter();
  const { accountDetails } = useLocalSearchParams();

  const handleDeepLink = useCallback((event) => {
    console.log("Full received URL (Payment):", event.url);
    let url = event.url;

    if (url.includes("#")) {
      url = url.replace("#", "?");
    }

    const parsedUrl = new URL(url);
    const code = parsedUrl.searchParams.get("code");
    const state = parsedUrl.searchParams.get("state");
    const idToken = parsedUrl.searchParams.get("id_token");

    console.log(
      "Extracted (Payment) - code:",
      code,
      "state:",
      state,
      "id_token:",
      idToken
    );

    if (code) {
      exchangeCodeForToken(code);
    } else {
      console.error("No code found in the URL");
    }
  }, []);

  useEffect(() => {
    if (authorizationUrl) {
      WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        "com.gigipiscitelli.hoopemvp://(authenticated)/(tabs)/revolut/payments"
      )
        .then((result) => {
          if (result.type === "success" && result.url) {
            handleDeepLink({ url: result.url });
          }
        })
        .catch((err) => console.error("An error occurred (Payment)", err));
    }
  }, [authorizationUrl, handleDeepLink]);

  const handleCreateConsent = async () => {
    if (!/^\d+(\.\d{1,2})?$/.test(paymentAmount)) {
      setError("Please enter a valid amount (e.g., 500.00)");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "supabase" });
      console.log(
        "Supabase token obtained:",
        token ? "Token exists" : "No token"
      );

      const consentDetails = {
        Data: {
          Initiation: {
            InstructionIdentification: "ACME412",
            EndToEndIdentification: "FRESCO.21302.GFX.20",
            InstructedAmount: {
              Amount: Number(paymentAmount).toFixed(2),
              Currency: JSON.parse(accountDetails).Currency,
            },
            CreditorAccount: {
              SchemeName: "UK.OBIE.SortCodeAccountNumber",
              Identification: "08080021325698",
              Name: "ACME Inc",
            },
            RemittanceInformation: {
              Unstructured: paymentReference,
            },
          },
        },
        Risk: {
          PaymentContextCode: "EcommerceGoods",
          MerchantCategoryCode: "5967",
          MerchantCustomerIdentification: "123456",
          DeliveryAddress: {
            AddressLine: ["Flat 7", "Acacia Lodge"],
            StreetName: "Acacia Avenue",
            BuildingNumber: "27",
            PostCode: "GU31 2ZZ",
            TownName: "Sparsholt",
            Country: "UK",
          },
        },
      };

      console.log(
        "Sending consent request to:",
        `${API_BASE_URL}/api/revolut-payments-consent`
      );
      console.log("Consent details:", JSON.stringify(consentDetails, null, 2));

      const response = await fetch(
        `${API_BASE_URL}/api/revolut-payments-consent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(consentDetails),
        }
      );

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        JSON.stringify(response.headers, null, 2)
      );

      const responseText = await response.text();
      console.log("Response body:", responseText);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${responseText}`
        );
      }

      const data = JSON.parse(responseText);
      console.log("Parsed response data:", JSON.stringify(data, null, 2));

      setConsentId(data.consentData.Data.ConsentId);
      setPaymentStatus(data.consentData.Data.Status);
      setAuthorizationUrl(data.authorizationUrl);
    } catch (err) {
      setError(err.message);
      console.error("Error creating consent:", err);
      if (err.response) {
        console.error("Error response:", await err.response.text());
      }
    } finally {
      setLoading(false);
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      const token = await getToken({ template: "supabase" });
      const response = await fetch(`${API_BASE_URL}/api/revolut-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "exchangeToken", code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            errorData.error || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      console.log("Token exchange response:", data);

      setAccessToken(data.access_token);
      if (data.refresh_token) {
        setRefreshToken(data.refresh_token);
      }

      return data;
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      setError(error.message);
      throw error;
    }
  };

  const initiatePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "supabase" });

      if (!consentId) {
        setError("Consent ID is missing. Please create a consent first.");
        return;
      }

      if (!accessToken) {
        setError(
          "Access token is missing. Please authorize the payment first."
        );
        return;
      }

      const paymentDetails = {
        Data: {
          ConsentId: consentId,
          Initiation: {
            InstructionIdentification: "ACME412",
            EndToEndIdentification: "FRESCO.21302.GFX.20",
            InstructedAmount: {
              Amount: Number(paymentAmount).toFixed(2),
              Currency: JSON.parse(accountDetails).Currency,
            },
            CreditorAccount: {
              SchemeName: "UK.OBIE.SortCodeAccountNumber",
              Identification: "08080021325698",
              Name: "ACME Inc",
            },
            RemittanceInformation: {
              Unstructured: paymentReference,
            },
          },
        },
        Risk: {
          PaymentContextCode: "EcommerceGoods",
          MerchantCategoryCode: "5967",
          MerchantCustomerIdentification: "123456",
          DeliveryAddress: {
            AddressLine: ["Flat 7", "Acacia Lodge"],
            StreetName: "Acacia Avenue",
            BuildingNumber: "27",
            PostCode: "GU31 2ZZ",
            TownName: "Sparsholt",
            Country: "UK",
          },
        },
      };

      console.log(
        "Sending payment details:",
        JSON.stringify(paymentDetails, null, 2)
      );

      const response = await fetch(`${API_BASE_URL}/api/revolut-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "initiatePayment",
          paymentDetails,
          consentId,
          accessToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.error.includes("Insufficient funds")) {
          Alert.alert("Insufficient funds");
          return;
        }
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            data.error || "Unknown error"
          }`
        );
      }

      setPaymentStatus(data.Data.Status);
      setDomesticPaymentId(data.Data.DomesticPaymentId);
    } catch (err) {
      setError(err.message);
      console.error("Error initiating payment:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      const token = await getToken({ template: "supabase" });

      if (!domesticPaymentId) {
        throw new Error("Domestic Payment ID is required");
      }

      const response = await fetch(`${API_BASE_URL}/api/revolut-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "checkStatus",
          domesticPaymentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${
            errorData.error || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      setPaymentStatus(data.Data.Status);
    } catch (err) {
      setError(err.message);
      console.error("Error checking payment status:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Create Payment Consent</Text>
          <TextInput
            style={styles.input}
            placeholder="Amount (e.g., 500.00)"
            value={paymentAmount}
            onChangeText={(text) => {
              const newText = text.replace(/[^0-9.]/g, "");
              const parts = newText.split(".");
              if (parts.length > 2) {
                return;
              }
              if (parts[1] && parts[1].length > 2) {
                return;
              }
              setPaymentAmount(newText);
            }}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Reference"
            value={paymentReference}
            onChangeText={setPaymentReference}
          />
          <View style={styles.buttonContainer}>
            <Button
              title="Create Payment Consent"
              onPress={handleCreateConsent}
              disabled={loading}
            />
          </View>
          {loading && <ActivityIndicator size="large" />}
          {error && <Text style={styles.error}>Error: {error}</Text>}
          {consentId && (
            <Text style={styles.consentId}>Consent ID: {consentId}</Text>
          )}
          {consentId && accessToken && (
            <View style={styles.buttonContainer}>
              <Button
                title="Initiate Payment"
                onPress={initiatePayment}
                disabled={loading}
              />
            </View>
          )}
          {domesticPaymentId && (
            <View style={styles.buttonContainer}>
              <Button
                title="Check Payment Status"
                onPress={checkPaymentStatus}
                disabled={loading}
              />
            </View>
          )}
          {paymentStatus && (
            <Text style={styles.paymentStatus}>
              Payment Status: {paymentStatus}
            </Text>
          )}
          <View style={styles.buttonContainer}>
            <Button title="Back to Accounts" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  error: {
    color: "red",
    marginTop: 10,
  },
  consentId: {
    marginTop: 10,
    fontWeight: "bold",
  },
  paymentStatus: {
    marginTop: 10,
    fontWeight: "bold",
    color: "green",
  },
});
