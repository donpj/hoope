import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { createJws } from "@/utils/jws-helper";

export default function RevolutPaymentScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { accountDetails } = useLocalSearchParams();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consentId, setConsentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handleCreateConsent = async () => {
    if (!/^\d+(\.\d{1,2})?$/.test(paymentAmount)) {
      setError("Please enter a valid amount (e.g., 500.00)");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "supabase" });

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

      const response = await fetch("/api/revolut-payments-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(consentDetails),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create payment consent");
      }

      setConsentId(result.Data.ConsentId);
      setPaymentStatus("Consent created");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
      <Button
        title="Create Payment Consent"
        onPress={handleCreateConsent}
        disabled={loading}
      />
      {loading && <ActivityIndicator size="large" />}
      {error && <Text style={styles.error}>Error: {error}</Text>}
      {consentId && (
        <Text style={styles.consentId}>Consent ID: {consentId}</Text>
      )}
      {paymentStatus && (
        <Text style={styles.paymentStatus}>
          Consent Status: {paymentStatus}
        </Text>
      )}
      <Button title="Back to Accounts" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
  error: {
    color: "red",
    marginTop: 10,
  },
  paymentStatus: {
    marginTop: 10,
    fontWeight: "bold",
  },
  consentId: {
    marginTop: 10,
    fontWeight: "bold",
  },
});
