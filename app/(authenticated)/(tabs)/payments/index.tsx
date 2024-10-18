import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

interface Beneficiary {
  AccountId: string;
  BeneficiaryId: string;
  Reference: string;
  CreditorAccount: {
    SchemeName: string;
    Identification: string;
    Name: string;
    SecondaryIdentification?: string;
  };
}

const API_BASE_URL = process.env.REVOLUT_API_URL || "https://api.hoope.co";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRandomColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function extractAccountDetails(
  schemeName: string,
  identification: string
): string {
  if (schemeName === "UK.OBIE.IBAN") {
    return `IBAN: ${identification}`;
  } else if (schemeName === "UK.OBIE.SortCodeAccountNumber") {
    const sortCode = identification.slice(0, 6);
    const accountNumber = identification.slice(6);
    return `Sort Code: ${sortCode} Account: ${accountNumber}`;
  }
  return identification;
}

export default function PaymentsIndex() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const router = useRouter();

  const fetchAccountsAndBeneficiaries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "supabase" });

      // Fetch accounts
      console.log("[PaymentsIndex] Fetching accounts...");
      const accountsResponse = await fetch(
        `${API_BASE_URL}/api/revolut-accounts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!accountsResponse.ok) {
        throw new Error(`HTTP error! status: ${accountsResponse.status}`);
      }

      const accountsData = await accountsResponse.json();
      console.log(
        "[PaymentsIndex] Accounts response:",
        JSON.stringify(accountsData, null, 2)
      );

      if (!accountsData.Data || !Array.isArray(accountsData.Data.Account)) {
        throw new Error("Unexpected accounts data structure");
      }

      const accounts: Account[] = accountsData.Data.Account;

      // Fetch beneficiaries for each account
      const allBeneficiaries: Beneficiary[] = [];
      const seenBeneficiaries = new Set<string>();

      for (const account of accounts) {
        console.log(
          `[PaymentsIndex] Fetching beneficiaries for account: ${account.AccountId}`
        );
        const beneficiariesResponse = await fetch(
          `${API_BASE_URL}/api/revolut-accounts?beneficiaries=true&accountId=${account.AccountId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!beneficiariesResponse.ok) {
          console.warn(
            `Failed to fetch beneficiaries for account ${account.AccountId}`
          );
          continue;
        }

        const beneficiariesData = await beneficiariesResponse.json();
        console.log(
          `[PaymentsIndex] Beneficiaries response for account ${account.AccountId}:`,
          JSON.stringify(beneficiariesData, null, 2)
        );

        if (
          beneficiariesData.Data &&
          Array.isArray(beneficiariesData.Data.Beneficiary)
        ) {
          beneficiariesData.Data.Beneficiary.forEach(
            (beneficiary: Beneficiary) => {
              const uniqueId = `${beneficiary.BeneficiaryId}-${beneficiary.CreditorAccount.Identification}`;
              if (!seenBeneficiaries.has(uniqueId)) {
                seenBeneficiaries.add(uniqueId);
                allBeneficiaries.push(beneficiary);
                console.log(
                  `[PaymentsIndex] Added beneficiary: ${JSON.stringify(
                    beneficiary,
                    null,
                    2
                  )}`
                );
              } else {
                console.log(
                  `[PaymentsIndex] Skipped duplicate beneficiary: ${JSON.stringify(
                    beneficiary,
                    null,
                    2
                  )}`
                );
              }
            }
          );
        }
      }

      console.log(
        `[PaymentsIndex] Total unique beneficiaries: ${allBeneficiaries.length}`
      );
      setBeneficiaries(allBeneficiaries);
    } catch (err) {
      console.error(
        "[PaymentsIndex] Error fetching accounts and beneficiaries:",
        err
      );
      setError(err.message || "Failed to fetch accounts and beneficiaries");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchAccountsAndBeneficiaries();
  }, [fetchAccountsAndBeneficiaries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccountsAndBeneficiaries().then(() => setRefreshing(false));
  }, [fetchAccountsAndBeneficiaries]);

  const beneficiariesWithColors = useMemo(
    () =>
      beneficiaries.map((beneficiary) => ({
        ...beneficiary,
        color: getRandomColor(),
      })),
    [beneficiaries]
  );

  const renderBeneficiary = ({
    item,
  }: {
    item: Beneficiary & { color: string };
  }) => (
    <TouchableOpacity
      style={styles.beneficiaryItem}
      onPress={() =>
        router.push({
          pathname: `/payments/${item.BeneficiaryId}`,
          params: { beneficiary: JSON.stringify(item) },
        })
      }
    >
      <View style={[styles.beneficiaryIcon, { backgroundColor: item.color }]}>
        <Text style={styles.initialsText}>
          {getInitials(item.CreditorAccount.Name)}
        </Text>
      </View>
      <View style={styles.beneficiaryDetails}>
        <Text style={styles.beneficiaryName}>{item.CreditorAccount.Name}</Text>
        <Text style={styles.beneficiaryInfo}>
          {extractAccountDetails(
            item.CreditorAccount.SchemeName,
            item.CreditorAccount.Identification
          )}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" color="#007AFF" />;
  if (error) return <Text style={styles.errorText}>Error: {error}</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={beneficiariesWithColors}
        renderItem={renderBeneficiary}
        keyExtractor={(item) => item.BeneficiaryId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={<Text style={styles.title}>Beneficiaries</Text>}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No beneficiaries found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    marginVertical: 20,
    marginHorizontal: 16,
  },
  beneficiaryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  beneficiaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  initialsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  beneficiaryDetails: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  beneficiaryInfo: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: "#C7C7CC",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    margin: 20,
  },
  emptyText: {
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 20,
  },
});
