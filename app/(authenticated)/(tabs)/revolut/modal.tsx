import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";

const formatNumber = (num: number | string) => {
  return Number(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function Modal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const accounts = JSON.parse((params.accounts as string) || "[]");
  const balances = JSON.parse((params.balances as string) || "{}");

  const handleAccountSelect = (account) => {
    router.push({
      pathname: "/revolut",
      params: { selectedAccount: JSON.stringify(account) },
    });
  };

  const renderAccount = ({ item }) => (
    <TouchableOpacity
      style={styles.accountItem}
      onPress={() => handleAccountSelect(item)}
    >
      <Text style={styles.accountName}>
        {item.Nickname || item.AccountType}
      </Text>
      <Text style={styles.accountCurrency}>{item.Currency}</Text>
      {balances[item.AccountId] && (
        <Text style={styles.accountBalance}>
          Balance: {item.Currency}{" "}
          {formatNumber(balances[item.AccountId].Amount.Amount)}
        </Text>
      )}
    </TouchableOpacity>
  );

  const accountsData = Array.isArray(accounts)
    ? accounts
    : accounts?.Data?.Account || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Accounts</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      {accountsData.length > 0 ? (
        <FlatList
          data={accountsData}
          renderItem={renderAccount}
          keyExtractor={(item) => item.AccountId}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <Text style={styles.noAccountsText}>No accounts available</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: Colors.dark,
  },
  accountItem: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.dark,
  },
  accountCurrency: {
    fontSize: 14,
    color: Colors.gray,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
    color: Colors.dark,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  closeButtonText: {
    color: Colors.light,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  listContent: {
    padding: 20,
  },
  noAccountsText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: Colors.gray,
  },
});
