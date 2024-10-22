import axios from "axios";
import https from "https";
import {
    getRevolutAccessToken,
    refreshRevolutToken,
} from "@/utils/revolut-token-manager";
import { NextResponse } from "next/server";

const BASE_URL = process.env.REVOLUT_URL || "https://sandbox-oba.revolut.com";

const getHeaders = async () => {
    const accessToken = await getRevolutAccessToken();
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-fapi-financial-id": process.env.REVOLUT_FINANCIAL_ID,
    };
};

const apiRequest = async <T>(method: string, endpoint: string, data?: any) => {
    const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: await getHeaders(),
        data,
        httpsAgent: new https.Agent({
            cert: process.env.REVOLUT_CERT,
            key: process.env.REVOLUT_PRIVATE_KEY,
            rejectUnauthorized: false, // Only for testing, remove in production
        }),
    };

    try {
        const response = await axios(config);
        return response.data as T;
    } catch (error) {
        console.error(`Error in ${method} request to ${endpoint}:`, error);
        throw error;
    }
};

// GET requests
export const getAllAccounts = () => apiRequest("get", "/accounts");

export const getAccountBalance = (accountId: string) =>
    apiRequest("get", `/accounts/${accountId}/balances`);
export const getAccountBeneficiaries = (accountId: string) =>
    apiRequest("get", `/accounts/${accountId}/beneficiaries`);
export const getAccountTransactions = (accountId: string) =>
    apiRequest("get", `/accounts/${accountId}/transactions`);

// POST requests
export const createAccountAccessConsent = (data: any) =>
    apiRequest("post", "/account-access-consents", data);

// DELETE requests
export const deleteAccountAccessConsent = (consentId: string) =>
    apiRequest("delete", `/account-access-consents/${consentId}`);

// Add more functions as needed

export async function getAccounts(accessToken: string) {
    const accountsUrl = `${process.env.REVOLUT_URL}/accounts`;
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;

    console.log("Using access token for accounts request:", accessToken);

    try {
        const accountsResponse = await axios.get(accountsUrl, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "x-fapi-financial-id": process.env.REVOLUT_FINANCIAL_ID,
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: false,
            }),
        });

        console.log("Accounts response:", accountsResponse.data);
        return accountsResponse.data;
    } catch (error) {
        console.error(
            "Error getting accounts:",
            error.response
                ? JSON.stringify(error.response.data)
                : error.message,
        );
        throw error;
    }
}
