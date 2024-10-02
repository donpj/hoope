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

export default function RevolutPaymentScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { consentId, accountDetails } = useLocalSearchParams();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "supabase" });

      // Create the paymentDetails object
      const paymentDetails = {
        Data: {
          ConsentId: consentId,
          Initiation: {
            InstructionIdentification: "ACME412",
            EndToEndIdentification: "FRESCO.21302.GFX.20",
            InstructedAmount: {
              Amount: paymentAmount,
              Currency: JSON.parse(accountDetails).Currency,
            },
            DebtorAccount: {
              SchemeName: JSON.parse(accountDetails).Account[0].SchemeName,
              Identification:
                JSON.parse(accountDetails).Account[0].Identification,
              Name: JSON.parse(accountDetails).Account[0].Name,
            },
            CreditorAccount: {
              SchemeName: "UK.OBIE.SortCodeAccountNumber",
              Identification: "08080021325698",
              Name: "ACME Inc",
            },
            RemittanceInformation: {
              Reference: paymentReference,
            },
          },
        },
        Risk: {},
      };

      console.log("Payment Details:", JSON.stringify(paymentDetails, null, 2));

      const paymentResponse = await fetch("/api/revolut-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentDetails),
      });

      const responseText = await paymentResponse.text();
      console.log("Raw API Response:", responseText);

      if (!paymentResponse.ok) {
        const errorData = JSON.parse(responseText);
        throw new Error(
          `Failed to initiate payment: ${paymentResponse.status}. ${
            errorData.details || errorData.error
          }`
        );
      }

      const paymentResult = JSON.parse(responseText);
      console.log("Payment Result:", JSON.stringify(paymentResult, null, 2));
      setPaymentStatus(paymentResult.Data.Status);
    } catch (err) {
      setError(err.message);
      console.error("Error initiating payment:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make a Payment</Text>
      <TextInput
        style={styles.input}
        placeholder="Amount"
        value={paymentAmount}
        onChangeText={setPaymentAmount}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Reference"
        value={paymentReference}
        onChangeText={setPaymentReference}
      />
      <Button
        title="Initiate Payment"
        onPress={handlePayment}
        disabled={loading}
      />
      {loading && <ActivityIndicator size="large" />}
      {error && <Text style={styles.error}>Error: {error}</Text>}
      {paymentStatus && (
        <Text style={styles.paymentStatus}>
          Payment Status: {paymentStatus}
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
});
