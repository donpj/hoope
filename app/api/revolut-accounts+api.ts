import https from "https";
import axios from "axios";
import fs from "fs";
import path from "path";
import { getRevolutAccessToken } from "../../utils/revolut-token-manager";

// Step 6: Get the list of accounts
async function getAccounts(accessToken: string) {
    const accountsUrl = "https://sandbox-oba.revolut.com/accounts";
    const cert = fs.readFileSync(path.resolve("certs/transport.pem"));
    const key = fs.readFileSync(path.resolve("certs/private.key"));

    console.log("Using access token for accounts request:", accessToken);

    try {
        const accountsResponse = await axios.get(accountsUrl, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "x-fapi-financial-id": "001580000103UAvAAM",
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: false, // Only for testing, remove in production
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

export async function GET(request: Request) {
    try {
        console.log("Fetching Revolut access token");
        const accessToken = await getRevolutAccessToken();
        console.log(
            "Received access token:",
            accessToken ? "Token exists" : "No token",
        );

        if (!accessToken) {
            return new Response(
                JSON.stringify({ error: "No valid access token available" }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        console.log("Fetching accounts with token");
        const accounts = await getAccounts(accessToken);
        return new Response(JSON.stringify(accounts), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
