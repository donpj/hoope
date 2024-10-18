import axios from "axios";

interface TokenData {
    accessToken: string;
    refreshToken: string;
    expirationTime: number;
}

function saveTokens(tokenData: TokenData) {
    process.env.REVOLUT_ACCESS_TOKEN = tokenData.accessToken;
    process.env.REVOLUT_REFRESH_TOKEN = tokenData.refreshToken;
    process.env.REVOLUT_TOKEN_EXPIRATION = tokenData.expirationTime.toString();
    console.log("Tokens saved to environment variables");
}

function loadTokens(): TokenData | null {
    const accessToken = process.env.REVOLUT_ACCESS_TOKEN;
    const refreshToken = process.env.REVOLUT_REFRESH_TOKEN;
    const expirationTime = process.env.REVOLUT_TOKEN_EXPIRATION;

    if (accessToken && refreshToken && expirationTime) {
        console.log("Tokens loaded from environment variables");
        return {
            accessToken,
            refreshToken,
            expirationTime: parseInt(expirationTime, 10),
        };
    }
    console.log("No token data available in environment variables");
    return null;
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

async function refreshToken() {
    try {
        const response = await axios.post(
            `${process.env.REVOLUT_URL}/oauth2/token`,
            {
                grant_type: "refresh_token",
                refresh_token: process.env.REVOLUT_REFRESH_TOKEN,
                client_id: process.env.REVOLUT_CLIENT_ID,
                client_secret: process.env.REVOLUT_CLIENT_SECRET,
            },
        );

        const { access_token, refresh_token, expires_in } = response.data;
        await storeRevolutTokens(access_token, refresh_token, expires_in);
        return access_token;
    } catch (error) {
        console.error("Error refreshing token:", error);
        throw error;
    }
}

export async function getRevolutAccessToken() {
    console.log("[Server] Getting Revolut access token");
    let accessToken = process.env.REVOLUT_ACCESS_TOKEN;
    const refreshToken = process.env.REVOLUT_REFRESH_TOKEN;
    const expirationTime = parseInt(
        process.env.REVOLUT_TOKEN_EXPIRATION || "0",
        10,
    );

    console.log("[Server] Current time:", Date.now());
    console.log("[Server] Token expiration time:", expirationTime);

    if (!accessToken || Date.now() >= expirationTime) {
        console.log(
            "[Server] Access token expired or not available, refreshing...",
        );
        accessToken = await refreshRevolutToken(refreshToken);
    }

    if (!accessToken) {
        console.error("[Server] Failed to obtain a valid access token");
        return null;
    }

    console.log(
        "[Server] Access token available (first 10 chars):",
        accessToken.substring(0, 10) + "...",
    );
    return accessToken;
}

export async function refreshRevolutToken(): Promise<string | null> {
    try {
        const tokenData = loadTokens();
        if (!tokenData || !tokenData.refreshToken) {
            console.error("No refresh token available");
            return null;
        }

        const response = await axios.post(
            `${process.env.REVOLUT_HOST}/token`,
            {
                grant_type: "refresh_token",
                refresh_token: tokenData.refreshToken,
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
