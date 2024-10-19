import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
  const [accountDetails, setAccountDetails] = useState(null);
  const [fetchedAccountDetails, setFetchedAccountDetails] = useState(null);
  const [beneficiaryDetails, setBeneficiaryDetails] = useState(null);

  const { getToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log("Raw accountDetails in Search:", accountDetails);
    if (accountDetails) {
      try {
        const parsed = JSON.parse(accountDetails as string);
        console.log("Parsed accountDetails in Search:", parsed);
      } catch (error) {
        console.error("Error parsing accountDetails in Search:", error);
      }
    } else {
      console.log("No accountDetails provided in Search");
    }
  }, [accountDetails]);

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

  const createTransactionDetails = () => {
    const activeAccountDetails = accountDetails || fetchedAccountDetails;

    if (!activeAccountDetails || !beneficiaryDetails) {
      setError(
        "Account details or beneficiary details not available. Please try again."
      );
      return null;
    }

    console.log(
      "Active Account Details:",
      JSON.stringify(activeAccountDetails, null, 2)
    );
    console.log(
      "Beneficiary Details:",
      JSON.stringify(beneficiaryDetails, null, 2)
    );

    return {
      Data: {
        Initiation: {
          InstructionIdentification: "ID412",
          EndToEndIdentification: "E2E123",
          InstructedAmount: {
            Amount: Number(paymentAmount).toFixed(2),
            Currency: activeAccountDetails.Currency || "GBP",
          },
          CreditorAccount: {
            SchemeName: beneficiaryDetails.CreditorAccount.SchemeName,
            Identification: beneficiaryDetails.CreditorAccount.Identification,
            Name: beneficiaryDetails.CreditorAccount.Name,
          },
          RemittanceInformation: {
            Unstructured: paymentReference,
          },
        },
      },
      Risk: {
        PaymentContextCode: "EcommerceGoods",
        MerchantCategoryCode: "5967",
        MerchantCustomerIdentification: "1238808123123",
        DeliveryAddress: {
          AddressLine: ["7"],
          StreetName: "Apple Street",
          BuildingNumber: "1",
          PostCode: "E2 7AA",
          TownName: "London",
          Country: "UK",
        },
      },
    };
  };

  const handleCreateConsent = async () => {
    if (!/^\d+(\.\d{1,2})?$/.test(paymentAmount)) {
      setError("Please enter a valid amount (e.g., 500.00)");
      return;
    }

    const transactionDetails = createTransactionDetails();
    if (!transactionDetails) return;

    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "supabase" });

      console.log(
        "Sending consent request to:",
        `${API_BASE_URL}/api/revolut-payments-consent`
      );
      console.log(
        "Transaction details:",
        JSON.stringify(transactionDetails, null, 2)
      );

      const response = await fetch(
        `${API_BASE_URL}/api/revolut-payments-consent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(transactionDetails),
        }
      );

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        JSON.stringify(response.headers, null, 2)
      );

      const responseText = await response.text();
      console.log("Raw response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse error:", parseError);
        throw new Error(`Failed to parse response: ${responseText}`);
      }

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

      if (!consentId || !accessToken) {
        setError(
          "Consent ID or Access token is missing. Please create a consent first."
        );
        return;
      }

      const transactionDetails = createTransactionDetails();
      if (!transactionDetails) return;

      // Add ConsentId to the transaction details
      transactionDetails.Data.ConsentId = consentId;

      console.log(
        "Sending payment details:",
        JSON.stringify(transactionDetails, null, 2)
      );

      const response = await fetch(`${API_BASE_URL}/api/revolut-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "initiatePayment",
          paymentDetails: transactionDetails,
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

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      const token = await getToken({ template: "supabase" });
      const response = await fetch(`${API_BASE_URL}/api/revolut-accounts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched account details:", JSON.stringify(data, null, 2));

      if (
        data &&
        data.Data &&
        data.Data.Account &&
        data.Data.Account.length > 0
      ) {
        setFetchedAccountDetails(data.Data.Account[0]); // Assuming we're using the first account
      } else {
        throw new Error("No account details found");
      }
    } catch (error) {
      console.error("Error fetching account details:", error);
      setError("Failed to fetch account details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  useEffect(() => {
    if (params.beneficiary) {
      try {
        const parsedBeneficiary = JSON.parse(params.beneficiary as string);
        setBeneficiaryDetails(parsedBeneficiary);
        console.log("Parsed beneficiary details:", parsedBeneficiary);
      } catch (error) {
        console.error("Error parsing beneficiary details:", error);
      }
    }
  }, [params.beneficiary]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Money</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!accountDetails && !fetchedAccountDetails ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <>
            {beneficiaryDetails && (
              <View style={styles.beneficiaryCard}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {getInitials(beneficiaryDetails.CreditorAccount.Name)}
                  </Text>
                </View>
                <View style={styles.beneficiaryInfo}>
                  <Text style={styles.beneficiaryName}>
                    {beneficiaryDetails.CreditorAccount.Name}
                  </Text>
                  <Text style={styles.accountDetails}>
                    {beneficiaryDetails.CreditorAccount.SchemeName}:{" "}
                    {beneficiaryDetails.CreditorAccount.Identification}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
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
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Reference</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter reference"
                value={paymentReference}
                onChangeText={setPaymentReference}
              />
            </View>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleCreateConsent}
              disabled={loading}
            >
              <Text style={styles.sendButtonText}>Create Payment Consent</Text>
            </TouchableOpacity>
            {loading && (
              <ActivityIndicator size="large" style={styles.loader} />
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            {consentId && (
              <Text style={styles.consentId}>Consent ID: {consentId}</Text>
            )}
            {consentId && accessToken && (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={initiatePayment}
                disabled={loading}
              >
                <Text style={styles.sendButtonText}>Initiate Payment</Text>
              </TouchableOpacity>
            )}

            {paymentStatus && (
              <Text style={styles.paymentStatus}>
                Payment Status: {paymentStatus}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginTop: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
  },
  beneficiaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  accountDetails: {
    fontSize: 14,
    color: "#666666",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loader: {
    marginTop: 16,
  },
  error: {
    color: "red",
    marginTop: 16,
  },
  consentId: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentStatus: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "bold",
    color: "green",
  },
});

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
