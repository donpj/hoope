import axios from "axios";
import fs from "fs";
import path from "path";

const TOKEN_FILE = path.join(process.cwd(), "revolut-token.json");

interface TokenData {
    accessToken: string;
    refreshToken: string;
    expirationTime: number;
}

function saveTokens(tokenData: TokenData) {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData));
    console.log("Tokens saved to file");
}

function loadTokens(): TokenData | null {
    try {
        const data = fs.readFileSync(TOKEN_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.log("No token file found or error reading file");
        return null;
    }
}

export async function storeRevolutTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
) {
    const tokenData: TokenData = {
        accessToken,
        refreshToken,
        expirationTime: Date.now() + expiresIn * 1000,
    };
    saveTokens(tokenData);
    console.log("Tokens stored successfully");
}

export async function getRevolutAccessToken(): Promise<string | null> {
    const tokenData = loadTokens();
    console.log("Loaded token data:", tokenData);

    if (!tokenData) {
        console.log("No token data available");
        return null;
    }

    if (Date.now() >= tokenData.expirationTime) {
        console.log("Token has expired, attempting to refresh");
        return refreshRevolutToken(tokenData.refreshToken);
    }

    console.log("Returning valid access token");
    return tokenData.accessToken;
}

async function refreshRevolutToken(
    refreshToken: string,
): Promise<string | null> {
    try {
        const response = await axios.post(
            "https://sandbox-oba-auth.revolut.com/token",
            {
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: process.env.REVOLUT_CLIENT_ID,
            },
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        const { access_token, refresh_token, expires_in } = response.data;
        await storeRevolutTokens(access_token, refresh_token, expires_in);
        console.log("Token refreshed successfully");
        return access_token;
    } catch (error) {
        console.error("Error refreshing Revolut token:", error);
        return null;
    }
}
