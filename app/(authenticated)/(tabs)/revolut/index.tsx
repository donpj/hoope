import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { defaultStyles } from "@/constants/Styles";
import RoundBtn from "@/components/RoundBtn";
import * as SecureStore from "expo-secure-store";
import {
  getRevolutAccessToken,
  refreshRevolutToken,
} from "@/utils/revolut-token-manager";
import CountryFlag from "react-native-country-flag";
import { useHeaderHeight } from "@react-navigation/elements";

const API_BASE_URL = process.env.REVOLUT_API_URL || "https://api.hoope.co";

// Add this interface definition near the top of the file
interface TransactionType {
  CreditDebitIndicator: "Credit" | "Debit";
  TransactionInformation?: string;
  BookingDateTime: string;
  MerchantDetails?: {
    MerchantName?: string;
  };
  BankTransactionCode?: {
    Code: string;
  };
  Balance?: {
    Amount: {
      Amount: number | string;
      Currency: string;
    };
  };
  TransactionReference?: string;
  Amount: {
    Amount: number | string;
    Currency: string;
  };
  TransactionId: string;
}

// Add this interface near the top of the file
interface ConsentData {
  Data: {
    ConsentId: string;
  };
}

// Add this interface near the top of the file
interface AccountType {
  AccountId: string;
  Nickname?: string;
  AccountType: string;
  Currency: string;
}

const formatNumber = (num: number | string) => {
  return Number(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const renderTransaction = ({ item }: { item: TransactionType }) => (
  <View style={styles.transactionItem}>
    <View style={styles.circle}>
      <Ionicons
        name={item.CreditDebitIndicator === "Credit" ? "add" : "remove"}
        size={24}
        color={Colors.dark.text}
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.transactionInfo}>
        {item.CreditDebitIndicator === "Credit" ? "Received" : "Sent"}
        {item.TransactionInformation ? `: ${item.TransactionInformation}` : ""}
      </Text>
      <Text style={styles.transactionDate}>
        {new Date(item.BookingDateTime).toLocaleString()}
      </Text>
      {item.MerchantDetails && item.MerchantDetails.MerchantName && (
        <Text style={styles.transactionDetail}>
          Merchant: {item.MerchantDetails.MerchantName}
        </Text>
      )}
      {item.BankTransactionCode && (
        <Text style={styles.transactionDetail}>
          Transaction Code: {item.BankTransactionCode.Code}
        </Text>
      )}
      {item.Balance && (
        <Text style={styles.transactionDetail}>
          Balance After: {formatNumber(item.Balance.Amount.Amount)}{" "}
          {item.Balance.Amount.Currency}
        </Text>
      )}
      {item.TransactionReference && (
        <Text style={styles.transactionDetail}>
          Reference: {item.TransactionReference}
        </Text>
      )}
    </View>
    <Text style={styles.transactionAmount}>
      {item.CreditDebitIndicator === "Credit" ? "+" : "-"}
      {formatNumber(item.Amount.Amount)} {item.Amount.Currency}
    </Text>
  </View>
);

const AccountItem = ({
  item,
  balances,
  fetchAccountBalance,
  transactions,
  fetchTransactions,
}: {
  item: any;
  balances: any;
  fetchAccountBalance: (accountId: string) => void;
  transactions: any;
  fetchTransactions: (accountId: string) => void;
}) => {
  const [showBalance, setShowBalance] = useState(false);

  const toggleBalance = () => {
    if (!showBalance && !balances[item.AccountId]) {
      fetchAccountBalance(item.AccountId);
    }
    setShowBalance(!showBalance);
  };

  return (
    <View style={styles.accountItem}>
      <Text style={styles.accountName}>
        {item.Nickname || item.AccountType}
      </Text>
      <Text style={styles.accountCurrency}>{item.Currency}</Text>

      <TouchableOpacity onPress={toggleBalance} style={styles.balanceContainer}>
        {showBalance && balances[item.AccountId] ? (
          <View>
            <Text style={styles.balanceAmount}>
              {balances[item.AccountId].CreditDebitIndicator === "Debit"
                ? "-"
                : ""}
              {item.Currency}{" "}
              {formatNumber(balances[item.AccountId].Amount.Amount)}
            </Text>
            <Text style={styles.balanceType}>
              {balances[item.AccountId].Type}
            </Text>
          </View>
        ) : (
          <Text style={styles.showBalanceButton}>Show Balance</Text>
        )}
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <RoundBtn
          icon="refresh"
          text={balances[item.AccountId] ? "Refresh Balance" : "Fetch Balance"}
          onPress={() => fetchAccountBalance(item.AccountId)}
        />
        <RoundBtn
          icon="list"
          text={
            transactions[item.AccountId]
              ? "Refresh Transactions"
              : "View Transactions"
          }
          onPress={() => fetchTransactions(item.AccountId)}
        />
      </View>

      {transactions[item.AccountId] && (
        <>
          <Text style={defaultStyles.sectionHeader}>Transactions</Text>
          {transactions[item.AccountId].Data.Transaction.length > 0 ? (
            <FlatList
              data={transactions[item.AccountId].Data.Transaction}
              renderItem={renderTransaction}
              keyExtractor={(transaction) => transaction.TransactionId}
              scrollEnabled={false}
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
};

interface AccountsModalProps {
  visible: boolean;
  accounts: any[];
  onClose: () => void;
  onSelectAccount: (account: any) => void;
}

// Add this function at the top of your file or in a separate utilities file
const getCurrencyCountryCode = (currency: string) => {
  const currencyToCountry: { [key: string]: string } = {
    USD: "US",
    EUR: "EU",
    GBP: "GB",
    // Add more currency to country mappings as needed
  };
  return currencyToCountry[currency] || "N/A"; // Default to US if not found
};

// Update the AccountsModal component
const AccountsModal: React.FC<AccountsModalProps> = ({
  visible,
  accounts,
  onClose,
  onSelectAccount,
}) => {
  const [scaleValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const renderAccountItem = ({ item }: { item: AccountType }) => (
    <TouchableOpacity
      style={styles.modalAccountItem}
      onPress={() => {
        onSelectAccount(item);
        onClose();
      }}
    >
      <View style={styles.modalAccountItemContent}>
        <CountryFlag
          isoCode={getCurrencyCountryCode(item.Currency)}
          size={24}
          style={styles.modalAccountFlag}
        />
        <View style={styles.modalAccountInfo}>
          <Text style={styles.modalAccountName}>
            {item.Nickname || item.AccountType}
          </Text>
          <Text style={styles.modalAccountCurrency}>{item.Currency}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.gray} />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[
          styles.modalContainer,
          {
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Your Accounts</Text>
          <FlatList
            data={accounts}
            renderItem={renderAccountItem}
            keyExtractor={(item) => item.AccountId}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

export default function RevolutConsentScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [transactions, setTransactions] = useState({});
  const [selectedAccount, setSelectedAccount] = useState<AccountType | null>(
    null
  );
  const [balances, setBalances] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  const params = useLocalSearchParams();

  const headerHeight = useHeaderHeight();

  useEffect(() => {
    if (params.selectedAccount) {
      const account = JSON.parse(params.selectedAccount as string);
      setSelectedAccount(account);
      fetchAccountBalance(account.AccountId);
    }
  }, [params.selectedAccount]);

  const handleDeepLink = useCallback((event: { url: string }) => {
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

  const handleCreateOrRefreshConsent = async () => {
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

      // If we have a new authorization URL, open it
      if (data.authorizationUrl) {
        WebBrowser.openAuthSessionAsync(
          data.authorizationUrl,
          "yourapp://callback"
        )
          .then((result) => {
            if (result.type === "success" && result.url) {
              handleDeepLink({ url: result.url });
            }
          })
          .catch((err) => console.error("An error occurred", err));
      }
    } catch (error) {
      console.error("Error creating/refreshing consent:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (code: string) => {
    try {
      setLoading(true);
      const token = await getToken({ template: "supabase" });

      console.log("Exchanging code for token...");
      const tokenResponse = await fetch(
        `${API_BASE_URL}/api/revolut-accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        }
      );

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
      const error = err as Error;
      setError(error.message);
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
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

  const renderHeader = () => (
    <>
      <TouchableOpacity
        style={[defaultStyles.pillButtonSmall, styles.connectButton]}
        onPress={handleCreateOrRefreshConsent}
      >
        <Text
          style={[defaultStyles.buttonTextSmall, { color: Colors.light.text }]}
        >
          {consentData ? "Refresh Revolut Consent" : "Connect Revolut Account"}
        </Text>
      </TouchableOpacity>

      {consentData && (
        <View style={styles.loginDetails}>
          <Text style={defaultStyles.sectionHeader}>Login Details:</Text>
          <Text>
            Phone Number: <Text selectable={true}>7208764550</Text>
          </Text>
          <Text>Pin: 0000</Text>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color={Colors.primary} />}
      {error && <Text style={styles.error}>Error: {error}</Text>}

      {accounts && accounts.Data && accounts.Data.Account && (
        <>
          <Text style={defaultStyles.sectionHeader}>Your Revolut Account</Text>
          <TouchableOpacity
            style={[defaultStyles.pillButtonSmall, styles.accountsButton]}
            onPress={() => setModalVisible(true)}
          >
            <Text
              style={[
                defaultStyles.buttonTextSmall,
                { color: Colors.light.text },
              ]}
            >
              {selectedAccount ? "Accounts" : "Select Account"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  useEffect(() => {
    const loadSelectedAccount = async () => {
      try {
        const savedAccount = await SecureStore.getItemAsync("selectedAccount");
        if (savedAccount) {
          setSelectedAccount(JSON.parse(savedAccount));
        }
      } catch (error) {
        console.error("Error loading selected account:", error);
      }
    };
    loadSelectedAccount();
  }, []);

  const handleSelectAccount = async (account: AccountType) => {
    setSelectedAccount(account);
    try {
      await SecureStore.setItemAsync(
        "selectedAccount",
        JSON.stringify(account)
      );
    } catch (error) {
      console.error("Error saving selected account:", error);
    }
    fetchAccountBalance(account.AccountId);
    setModalVisible(false); // Close the modal after selection
  };

  const fetchWithRetry = useCallback(
    async (url: string, options: RequestInit) => {
      try {
        const accessToken = await getRevolutAccessToken();
        if (!accessToken) {
          throw new Error("No valid access token available");
        }

        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        };

        const response = await fetch(url, options);
        if (response.status === 401) {
          // Token might be expired, try to refresh it
          const newToken = await refreshRevolutToken();
          if (newToken) {
            options.headers = {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            };
            return await fetch(url, options);
          } else {
            throw new Error("Failed to refresh token");
          }
        }
        return response;
      } catch (error) {
        console.error("Error in fetchWithRetry:", error);
        throw error;
      }
    },
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 50 }]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleCreateOrRefreshConsent}
            />
          }
        >
          {renderHeader()}
          {selectedAccount ? (
            <AccountItem
              item={selectedAccount}
              balances={balances}
              fetchAccountBalance={fetchAccountBalance}
              transactions={transactions}
              fetchTransactions={fetchTransactions}
            />
          ) : (
            <Text style={styles.noAccountSelected}>
              No account selected. Click "Select Account" to choose an account.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <AccountsModal
        visible={modalVisible}
        accounts={accounts?.Data?.Account || []}
        onClose={() => setModalVisible(false)}
        onSelectAccount={handleSelectAccount}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  connectButton: {
    backgroundColor: Colors.primary,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  loginDetails: {
    marginTop: 20,
    padding: 20,
    backgroundColor: Colors.lightGray,
    borderRadius: 16,
  },
  accountItem: {
    marginVertical: 10,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
  },
  accountName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  accountCurrency: {
    fontSize: 16,
    color: Colors.gray,
    marginBottom: 10,
  },
  balanceContainer: {
    marginTop: 10,
    color: Colors.light.text,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  balanceType: {
    fontSize: 14,
    color: Colors.gray,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 10,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  transactionInfo: {
    fontSize: 16,
    fontWeight: "500",
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.gray,
  },
  transactionDetail: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  noTransactions: {
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
    color: Colors.gray,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  paymentButton: {
    backgroundColor: Colors.primary,
  },
  error: {
    color: Colors.error,
    marginTop: 10,
    textAlign: "center",
  },
  showBalanceButton: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
  accountButton: {
    backgroundColor: Colors.primary,
    alignSelf: "center",
    marginTop: 20,
  },
  noAccountSelected: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: Colors.gray,
  },
  accountsButton: {
    backgroundColor: Colors.primary,
    alignSelf: "center",
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: Colors.light.text,
  },
  modalAccountItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: Colors.white,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalAccountItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalAccountFlag: {
    marginRight: 15,
  },
  modalAccountInfo: {
    flex: 1,
  },
  modalAccountName: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.light.text,
  },
  modalAccountCurrency: {
    fontSize: 14,
    color: Colors.gray,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignSelf: "center",
  },
  closeButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: "500",
  },
});
