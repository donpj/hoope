import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Beneficiary {
  AccountId: string;
  BeneficiaryId: string;
  CreditorAccount: {
    SchemeName: string;
    Identification: string;
    Name: string;
  };
  TotalSent: string;
  Email: string;
}

export default function BeneficiaryDetails() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const beneficiaryData = params.beneficiary
    ? JSON.parse(params.beneficiary as string)
    : null;

  if (!beneficiaryData) {
    return <Text>No beneficiary data found</Text>;
  }

  const beneficiary: Beneficiary = beneficiaryData;

  const getCountryAndCurrencyFromIban = (
    iban: string
  ): { country: string; currency: string } => {
    const countryCode = iban.slice(0, 2);
    const countries: { [key: string]: { name: string; currency: string } } = {
      GB: { name: "United Kingdom", currency: "GBP" },
      DE: { name: "Germany", currency: "EUR" },
      FR: { name: "France", currency: "EUR" },
      ES: { name: "Spain", currency: "EUR" },
      IT: { name: "Italy", currency: "EUR" },
      CH: { name: "Switzerland", currency: "CHF" },
      US: { name: "United States", currency: "USD" },
      // Add more countries as needed
    };
    const countryInfo = countries[countryCode] || {
      name: "Unknown",
      currency: "Unknown",
    };
    return { country: countryInfo.name, currency: countryInfo.currency };
  };

  const renderAccountDetails = () => {
    if (
      beneficiary.CreditorAccount.SchemeName === "UK.OBIE.SortCodeAccountNumber"
    ) {
      const sortCode = beneficiary.CreditorAccount.Identification.slice(0, 6);
      const accountNumber = beneficiary.CreditorAccount.Identification.slice(6);
      return (
        <>
          <DetailItem label="Account Number" value={accountNumber} />
          <DetailItem label="Sort Code" value={sortCode} />
          <DetailItem label="Country/Region" value="United Kingdom" />
          <DetailItem label="Currency" value="GBP" />
        </>
      );
    } else if (beneficiary.CreditorAccount.SchemeName.includes("IBAN")) {
      const iban = beneficiary.CreditorAccount.Identification;
      const { country, currency } = getCountryAndCurrencyFromIban(iban);
      return (
        <>
          <DetailItem label="IBAN" value={iban} />
          <DetailItem label="BIC / SWIFT" value="Not provided" />
          <DetailItem label="Country/Region" value={country} />
          <DetailItem label="Currency" value={currency} />
        </>
      );
    } else {
      return (
        <>
          <DetailItem
            label="Account Identification"
            value={beneficiary.CreditorAccount.Identification}
          />
          <DetailItem label="Country/Region" value="Unknown" />
          <DetailItem label="Currency" value="Unknown" />
        </>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Beneficiary Details</Text>
      </View>
      <ScrollView>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: getRandomColor() }]}>
            <Text style={styles.avatarText}>
              {getInitials(beneficiary.CreditorAccount.Name)}
            </Text>
          </View>
          <Text style={styles.name}>{beneficiary.CreditorAccount.Name}</Text>
        </View>
        <View style={styles.detailsContainer}>
          <DetailItem label="Total Sent" value={beneficiary.TotalSent} />
          {renderAccountDetails()}
          <DetailItem label="Email" value={beneficiary.Email} />
        </View>
      </ScrollView>
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  header: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
  },
  detailsContainer: {
    backgroundColor: "#FFFFFF",
    marginTop: 20,
    paddingHorizontal: 15,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  detailLabel: {
    fontSize: 16,
    color: "#8E8E93",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
  },
});
