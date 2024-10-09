import https from "https";
import axios from "axios";
import fs from "fs";
import path from "path";
import { storeRevolutTokens } from "../../utils/revolut-token-manager";

// Step 5: Exchange the authorization code for an access token
async function getAccessToken(authCode: string) {
    const tokenUrl = `${process.env.REVOLUT_HOST}/token}`;
    const tokenData = new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
    });

    console.log("Token request data:", tokenData.toString());

    // Load certificates
    const cert = fs.readFileSync(path.resolve("certs/transport.pem"));
    const key = fs.readFileSync(path.resolve("certs/private.key"));

    try {
        const tokenResponse = await axios.post(tokenUrl, tokenData, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: false, // Only for testing, remove in production
            }),
        });

        console.log("Token response:", tokenResponse.data);
        return tokenResponse.data; // Return full token data instead of just access_token
    } catch (error) {
        console.error("Error exchanging code for token:");
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        } else if (error.request) {
            console.error("No response received:", error.request);
        } else {
            console.error("Error setting up request:", error.message);
        }
        throw new Error(
            `Failed to exchange code for token: ${
                error.response
                    ? JSON.stringify(error.response.data)
                    : error.message
            }`,
        );
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
