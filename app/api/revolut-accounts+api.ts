import https from "https";
import axios from "axios";
import {
    getRevolutAccessToken,
    refreshRevolutToken,
} from "@/utils/revolut-token-manager";
import { NextResponse } from "next/server";
import { storeRevolutTokens } from "@/utils/revolut-token-manager";
import { REVOLUT_CA_CERT } from "@/app/api/revolut-ca-cert";

function sanitizeError(error: any) {
    return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        config: error.config
            ? {
                url: error.config.url,
                method: error.config.method,
                headers: error.config.headers,
            }
            : undefined,
        response: error.response
            ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                headers: error.response.headers,
            }
            : undefined,
    };
}

async function getAccessToken(authCode: string) {
    const tokenUrl = `${process.env.REVOLUT_HOST}/token`;
    console.log("Token URL:", tokenUrl);

    const tokenData = new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
    });
    console.log("Token request data:", tokenData.toString());

    // Load certificates from environment variables
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;
    const ca = REVOLUT_CA_CERT;

    console.log("Cert available:", !!cert);
    console.log("Key available:", !!key);
    console.log("CA available:", !!ca);
    try {
        const tokenResponse = await axios.post(tokenUrl, tokenData, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${
                    Buffer.from(
                        `${process.env.REVOLUT_CLIENT_ID}:${process.env.REVOLUT_CLIENT_SECRET}`,
                    ).toString("base64")
                }`,
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: false,
            }),
        });

        console.log("Token response status:", tokenResponse.status);
        console.log(
            "Token response data:",
            JSON.stringify(tokenResponse.data, null, 2),
        );

        return tokenResponse.data;
    } catch (error) {
        console.error("Error exchanging code for token:");
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error(
                "Response data:",
                JSON.stringify(error.response.data, null, 2),
            );
            console.error(
                "Response headers:",
                JSON.stringify(error.response.headers, null, 2),
            );
        } else if (error.request) {
            console.error("No response received:", error.request);
        } else {
            console.error("Error setting up request:", error.message);
        }
        console.error("Full error object:", JSON.stringify(error, null, 2));
        throw new Error(
            `Failed to exchange code for token: ${
                error.response
                    ? JSON.stringify(error.response.data)
                    : error.message
            }`,
        );
    }
}

// Step 6: Get the list of accounts
async function getAccounts(accessToken: string) {
    const accountsUrl = `${process.env.REVOLUT_URL}/accounts`;
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;
    const ca = REVOLUT_CA_CERT;

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

async function getTransactions(accessToken: string, accountId: string) {
    const transactionsUrl =
        `${process.env.REVOLUT_URL}/accounts/${accountId}/transactions`;
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;
    const ca = REVOLUT_CA_CERT;

    console.log("Using access token for transactions request:", accessToken);
    console.log("Transactions URL:", transactionsUrl);

    try {
        const response = await axios.get(transactionsUrl, {
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

        console.log(
            "Transactions response:",
            JSON.stringify(response.data, null, 2),
        );
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log("Access token expired, attempting to refresh...");
            const newToken = await refreshRevolutToken();
            if (newToken) {
                console.log("Token refreshed, retrying request...");
                return getTransactions(newToken, accountId);
            } else {
                console.error("Failed to refresh token");
                throw new Error("Failed to refresh access token");
            }
        }
        console.error("Error getting transactions:", sanitizeError(error));
        throw error;
    }
}

async function getAccountBalance(accessToken: string, accountId: string) {
    const balanceUrl =
        `${process.env.REVOLUT_URL}/accounts/${accountId}/balances`;
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;
    const ca = REVOLUT_CA_CERT;

    console.log("Fetching balance from URL:", balanceUrl);

    try {
        const balanceResponse = await axios.get(balanceUrl, {
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

        console.log(
            "Balance response:",
            JSON.stringify(balanceResponse.data, null, 2),
        );
        return balanceResponse.data;
    } catch (error) {
        console.error("Error getting account balance:", error);
        throw error;
    }
}

// Add this new function to get beneficiaries
async function getBeneficiaries(accessToken: string, accountId: string) {
    const beneficiariesUrl =
        `${process.env.REVOLUT_URL}/accounts/${accountId}/beneficiaries`;
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;
    const ca = REVOLUT_CA_CERT;

    console.log("[API] Fetching beneficiaries from URL:", beneficiariesUrl);

    try {
        const beneficiariesResponse = await axios.get(beneficiariesUrl, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/json",
                "x-fapi-financial-id": process.env.REVOLUT_FINANCIAL_ID,
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: false,
            }),
        });

        console.log(
            "[API] Beneficiaries response:",
            JSON.stringify(beneficiariesResponse.data, null, 2),
        );
        return beneficiariesResponse.data;
    } catch (error) {
        console.error(
            "[API] Error getting beneficiaries:",
            error.response ? error.response.data : error.message,
        );
        throw error;
    }
}

async function deleteAccountAccessConsent(
    accessToken: string,
    consentId: string,
) {
    const config = {
        method: "delete",
        maxBodyLength: Infinity,
        url: `${process.env.REVOLUT_URL}/account-access-consents/${consentId}`,
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "x-fapi-financial-id": process.env.REVOLUT_FINANCIAL_ID,
        },
        httpsAgent: new https.Agent({
            cert: process.env.REVOLUT_CERT,
            key: process.env.REVOLUT_PRIVATE_KEY,
        }),
    };

    try {
        const response = await axios(config);
        console.log(
            "[API] Delete consent response:",
            JSON.stringify(response.data),
        );
        return response.data;
    } catch (error) {
        console.error("[API] Error deleting consent:", error);
        throw error;
    }
}

export async function GET(request: Request) {
    console.log("[API] Received GET request:", request.url);
    try {
        const accessToken = await getRevolutAccessToken();
        if (!accessToken) {
            console.log("[API] No valid access token available");
            return NextResponse.json({
                error: "No valid access token available",
            }, { status: 401 });
        }

        const url = new URL(request.url);
        const accountId = url.searchParams.get("accountId");

        if (url.searchParams.get("beneficiaries") === "true") {
            if (!accountId) {
                return NextResponse.json({
                    error: "AccountId is required for fetching beneficiaries",
                }, { status: 400 });
            }
            console.log("[API] Fetching beneficiaries for account:", accountId);
            try {
                const beneficiaries = await getBeneficiaries(
                    accessToken,
                    accountId,
                );
                return NextResponse.json(beneficiaries);
            } catch (beneficiariesError) {
                console.error(
                    "[API] Error fetching beneficiaries:",
                    beneficiariesError,
                );
                return NextResponse.json({
                    error: "Failed to fetch beneficiaries",
                    details: beneficiariesError.response
                        ? beneficiariesError.response.data
                        : beneficiariesError.message,
                }, {
                    status: beneficiariesError.response
                        ? beneficiariesError.response.status
                        : 500,
                });
            }
        }

        console.log("[API] AccountId:", accountId);
        console.log(
            "[API] Query params:",
            Object.fromEntries(url.searchParams),
        );

        if (accountId) {
            if (url.searchParams.get("balances") === "true") {
                console.log("[API] Fetching balance for account:", accountId);
                try {
                    const balance = await getAccountBalance(
                        accessToken,
                        accountId,
                    );
                    console.log(
                        "[API] Balance response:",
                        JSON.stringify(balance, null, 2),
                    );
                    return NextResponse.json(balance);
                } catch (balanceError) {
                    console.error(
                        "[API] Error fetching balance:",
                        balanceError,
                    );
                    return NextResponse.json({
                        error: "Failed to fetch balance",
                        details: sanitizeError(balanceError),
                    }, { status: 500 });
                }
            } else {
                console.log("Fetching transactions for account:", accountId);
                const transactions = await getTransactions(
                    accessToken,
                    accountId,
                );
                return NextResponse.json(transactions);
            }
        } else {
            console.log("Fetching accounts");
            const accounts = await getAccounts(accessToken);
            return NextResponse.json(accounts);
        }
    } catch (error) {
        console.error("[API] Error in GET request:", error);
        return NextResponse.json({
            error: "Internal server error",
            details: error.message,
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const { code } = await request.json();
    try {
        const tokenData = await getAccessToken(code);
        console.log("Token data received:", JSON.stringify(tokenData, null, 2));
        await storeRevolutTokens(
            tokenData.access_token,
            tokenData.refresh_token,
            tokenData.expires_in,
        );
        return new Response(
            JSON.stringify({ message: "Access token stored successfully" }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        console.error("Error exchanging code for token:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function DELETE(request: Request) {
    console.log("[API] Received DELETE request:", request.url);
    try {
        const url = new URL(request.url);
        const consentId = url.searchParams.get("consentId");

        if (!consentId) {
            console.log("[API] DELETE request missing consentId");
            return NextResponse.json({ error: "ConsentId is required" }, {
                status: 400,
            });
        }

        console.log(
            `[API] Attempting to delete account access consent with ID: ${consentId}`,
        );
        const accessToken = await getRevolutAccessToken();

        if (!accessToken) {
            console.log(
                "[API] No valid access token available for DELETE request",
            );
            return NextResponse.json({
                error: "No valid access token available",
            }, { status: 401 });
        }

        await deleteAccountAccessConsent(accessToken, consentId);

        console.log(
            `[API] Successfully deleted account access consent with ID: ${consentId}`,
        );
        return NextResponse.json({
            message: "Account access consent deleted successfully",
        });
    } catch (error) {
        console.error("[API] Error in DELETE request:", error);
        return NextResponse.json({
            error: "An error occurred while deleting account access consent",
            details: error.response ? error.response.data : error.message,
        }, { status: error.response?.status || 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
