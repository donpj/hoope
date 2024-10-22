import axios from "axios";
import {
  getRevolutAccessToken,
  refreshRevolutToken,
  storeRevolutTokens,
} from "@/utils/revolut-token-manager";

const API_BASE_URL = process.env.REVOLUT_API_URL || "https://api.hoope.co";

async function makeAuthenticatedRequest(
  url: string,
  method: "get" | "post" | "delete",
  data?: any
) {
  try {
    const accessToken = await getRevolutAccessToken();
    if (!accessToken) {
      throw new Error("No valid access token available");
    }

    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      data,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const newToken = await refreshRevolutToken();
      if (newToken) {
        return makeAuthenticatedRequest(url, method, data);
      } else {
        throw new Error("Failed to refresh token");
      }
    }
    throw error;
  }
}

export async function exchangeCodeForTokens(code: string) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/revolut-accounts`, {
      action: "exchangeCode",
      code,
    });
    const { accessToken, refreshToken, expiresIn } = response.data;
    await storeRevolutTokens(accessToken, refreshToken, expiresIn);
    return { accessToken, refreshToken, expiresIn };
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    throw error;
  }
}

export async function retrieveAllAccounts() {
  return makeAuthenticatedRequest("/api/revolut-accounts", "get");
}

export async function retrieveAccount(accountId: string) {
  return makeAuthenticatedRequest(
    `/api/revolut-accounts?accountId=${accountId}`,
    "get"
  );
}

export async function retrieveAccountBalance(accountId: string) {
  return makeAuthenticatedRequest(
    `/api/revolut-accounts?accountId=${accountId}&balances=true`,
    "get"
  );
}

export async function retrieveAccountBeneficiaries(accountId: string) {
  return makeAuthenticatedRequest(
    `/api/revolut-accounts?accountId=${accountId}&beneficiaries=true`,
    "get"
  );
}

export async function retrieveAccountTransactions(accountId: string) {
  return makeAuthenticatedRequest(
    `/api/revolut-accounts?accountId=${accountId}`,
    "get"
  );
}

export async function deleteAccountAccessConsent(consentId: string) {
  return makeAuthenticatedRequest(
    `/api/revolut-accounts?consentId=${consentId}`,
    "delete"
  );
}
