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
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";

const API_BASE_URL = process.env.REVOLUT_API_URL || "https://api.hoope.co";

export default function RevolutConsentScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consentData, setConsentData] = useState(null);
  const [authorizationUrl, setAuthorizationUrl] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [transactions, setTransactions] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [balances, setBalances] = useState({});

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
      const response = await fetch(`${API_BASE_URL}/api/revolut-consent`, {
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

      console.log("Exchanging code for token...");
      const tokenResponse = await fetch(`${API_BASE_URL}/api/revolut-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const tokenResponseText = await tokenResponse.text();
      console.log("Token response:", tokenResponseText);

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to exchange code for token: ${tokenResponse.status} - ${tokenResponseText}`
        );
      }

      const { access_token } = JSON.parse(tokenResponseText);

      console.log("Fetching accounts...");
      const accountsResponse = await fetch(
        `${API_BASE_URL}/api/revolut-accounts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Revolut-Access-Token": access_token,
          },
        }
      );

      const accountsResponseText = await accountsResponse.text();
      console.log("Accounts response:", accountsResponseText);

      if (!accountsResponse.ok) {
        throw new Error(
          `Failed to fetch accounts: ${accountsResponse.status} - ${accountsResponseText}`
        );
      }

      const accountsData = JSON.parse(accountsResponseText);
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

  const fetchTransactions = async (accountId) => {
    try {
      setLoading(true);
      const token = await getToken({ template: "supabase" });

      console.log(`Fetching transactions for account: ${accountId}`);
      const response = await fetch(
        `${API_BASE_URL}/api/revolut-accounts?accountId=${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const responseText = await response.text();
      console.log(`Response for account ${accountId}:`, responseText);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${responseText}`
        );
      }

      const data = JSON.parse(responseText);
      setTransactions((prevState) => ({
        ...prevState,
        [accountId]: data,
      }));
    } catch (error) {
      console.error(
        `Error fetching transactions for account ${accountId}:`,
        error
      );
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountBalance = async (accountId) => {
    try {
      setLoading(true);
      const token = await getToken({ template: "supabase" });

      console.log(`Fetching balance for account: ${accountId}`);
      const response = await fetch(
        `${API_BASE_URL}/api/revolut-accounts?accountId=${accountId}&balances=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Balance response for account ${accountId}:`,
        JSON.stringify(data, null, 2)
      );

      if (data.Data && data.Data.Balance && data.Data.Balance[0]) {
        setBalances((prevState) => ({
          ...prevState,
          [accountId]: data.Data.Balance[0],
        }));
      } else {
        throw new Error("Unexpected balance data structure");
      }
    } catch (error) {
      console.error(`Error fetching balance for account ${accountId}:`, error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <Text style={styles.transactionInfo}>
        {item.CreditDebitIndicator === "Credit" ? "Received" : "Sent"}{" "}
        {item.Amount.Amount} {item.Amount.Currency}
      </Text>
      <Text>To: {item.CreditorAccount?.Name || "N/A"}</Text>
      <Text>Date: {new Date(item.BookingDateTime).toLocaleString()}</Text>
      <Text>Status: {item.Status}</Text>
      <Text>Info: {item.TransactionInformation}</Text>
    </View>
  );

  const renderAccount = ({ item }) => (
    <View style={styles.accountItem}>
      <Text style={styles.accountName}>
        {item.Nickname}, {item.Currency}
      </Text>
      <Text>Account ID: {item.AccountId}</Text>
      <Text>
        Type: {item.AccountType} - {item.AccountSubType}
      </Text>

      {balances[item.AccountId] && (
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceTitle}>Balance:</Text>
          <Text style={styles.balanceAmount}>
            {balances[item.AccountId].Amount.Amount}{" "}
            {balances[item.AccountId].Amount.Currency}
          </Text>
          <Text>Type: {balances[item.AccountId].Type}</Text>
          <Text>
            Credit/Debit: {balances[item.AccountId].CreditDebitIndicator}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.balanceButton}
        onPress={() => fetchAccountBalance(item.AccountId)}
      >
        <Text style={styles.balanceButtonText}>
          {balances[item.AccountId] ? "Refresh" : "Fetch"} Balance
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.transactionButton}
        onPress={() => fetchTransactions(item.AccountId)}
      >
        <Text style={styles.transactionButtonText}>
          {transactions[item.AccountId] ? "Refresh" : "View"} Transactions
        </Text>
      </TouchableOpacity>

      {transactions[item.AccountId] && (
        <>
          <Text style={styles.transactionsHeader}>Transactions</Text>
          {transactions[item.AccountId].Data.Transaction.length > 0 ? (
            <FlatList
              data={transactions[item.AccountId].Data.Transaction}
              renderItem={renderTransaction}
              keyExtractor={(transaction) => transaction.TransactionId}
            />
          ) : (
            <Text style={styles.noTransactions}>
              No transactions found for this account.
            </Text>
          )}
        </>
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
    backgroundColor: "#f2f2f7", // Light gray background
  },
  container: {
    flex: 1,
    paddingHorizontal: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginVertical: 20,
    marginLeft: 10,
    color: "#000",
  },

  accountDetails: {
    marginTop: 10,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  accountItem: {
    marginVertical: 10,
    marginHorizontal: 10,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  accountType: {
    fontSize: 14,
    color: "#8e8e93",
    marginBottom: 2,
  },
  accountCurrency: {
    fontSize: 14,
    color: "#8e8e93",
    marginBottom: 5,
  },
  accountBalance: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  error: {
    color: "#ff3b30",
    marginTop: 10,
    marginLeft: 10,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  transactionButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  transactionButtonText: {
    color: "#fff",
    textAlign: "center",
  },
  transactionsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
  },
  transactionItem: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  transactionType: {
    fontWeight: "bold",
    fontSize: 16,
  },
  legItem: {
    marginLeft: 10,
    marginTop: 5,
  },
  noTransactions: {
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
    color: "#666",
  },
  balanceContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  balanceButton: {
    backgroundColor: "#34C759",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  balanceButtonText: {
    color: "#fff",
    textAlign: "center",
  },
});
