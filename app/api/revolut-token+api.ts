import https from "https";
import axios from "axios";
import fs from "fs";
import path from "path";
import { storeRevolutTokens } from "@/utils/revolut-token-manager";
import { createClient } from '@supabase/supabase-js';

// Ensure these environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key');
  throw new Error('Supabase configuration is incomplete');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Step 5: Exchange the authorization code for an access token
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

    console.log("Cert available:", !!cert);
    console.log("Key available:", !!key);

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
                rejectUnauthorized: false, // Only for testing, remove in production
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

export async function POST(request: Request) {
    try {
        const { code } = await request.json();

        // Your token exchange logic here
        // ...

        // After obtaining the token, store it in Supabase
        const { data, error } = await supabase
            .from('revolut_tokens')
            .upsert({ 
                id: 1, 
                access_token: 'your_access_token',
                refresh_token: 'your_refresh_token',
                expires_at: new Date().toISOString()
            });

        if (error) throw error;

        return new Response(JSON.stringify({ message: "Token stored successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error in token exchange:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
