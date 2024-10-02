import axios from "axios";

let revolutAccessToken: string | null = null;
let revolutRefreshToken: string | null = null;
let tokenExpirationTime: number | null = null;

export async function storeRevolutTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
) {
    revolutAccessToken = accessToken;
    revolutRefreshToken = refreshToken;
    tokenExpirationTime = Date.now() + expiresIn * 1000;
    console.log("Tokens stored successfully");
}

export async function getRevolutAccessToken(): Promise<string | null> {
    console.log("Current access token:", revolutAccessToken);
    console.log("Token expiration time:", tokenExpirationTime);

    if (!revolutAccessToken || !tokenExpirationTime) {
        console.log("No access token or expiration time available");
        return null;
    }

    if (Date.now() >= tokenExpirationTime) {
        console.log("Token has expired, attempting to refresh");
        return refreshRevolutToken();
    }

    console.log("Returning valid access token");
    return revolutAccessToken;
}

async function refreshRevolutToken(): Promise<string | null> {
    if (!revolutRefreshToken) {
        console.log("No refresh token available");
        return null;
    }

    try {
        const response = await axios.post(
            "https://sandbox-oba-auth.revolut.com/token",
            {
                grant_type: "refresh_token",
                refresh_token: revolutRefreshToken,
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
