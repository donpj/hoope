import https from "https";
import axios from "axios";
import {
    getRevolutAccessToken,
    refreshRevolutToken,
} from "@/utils/revolut-token-manager";

// Step 6: Get the list of accounts
async function getAccounts(accessToken: string) {
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

async function getTransactions(accessToken: string, accountId: string) {
    const transactionsUrl =
        `${process.env.REVOLUT_URL}/accounts/${accountId}/transactions`;
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;

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

export async function GET(request: Request) {
    try {
        const accessToken = await getRevolutAccessToken();
        if (!accessToken) {
            return new Response(
                JSON.stringify({ error: "No valid access token available" }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const url = new URL(request.url);
        const accountId = url.searchParams.get("accountId");

        if (accountId) {
            if (url.searchParams.get("balances") === "true") {
                console.log("Fetching balance for account:", accountId);
                const balance = await getAccountBalance(accessToken, accountId);
                return new Response(JSON.stringify(balance), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            } else {
                console.log("Fetching transactions for account:", accountId);
                const transactions = await getTransactions(
                    accessToken,
                    accountId,
                );
                return new Response(JSON.stringify(transactions), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }
        } else {
            console.log("Fetching accounts");
            const accounts = await getAccounts(accessToken);
            return new Response(JSON.stringify(accounts), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (error) {
        console.error("Error in API:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
