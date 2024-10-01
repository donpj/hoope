import https from "https";
import { NextResponse } from "next/server";
import axios from "axios";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

// Next.js API route handler for Revolut consent creation
export async function POST(request: Request) {
    console.log("POST function called");

    try {
        console.log("Starting consent creation process");

        // Step 1: Generate client credentials token
        console.log("Generating client credentials token...");
        const tokenUrl = "https://sandbox-oba-auth.revolut.com/token";
        const tokenData = new URLSearchParams({
            grant_type: "client_credentials",
            scope: "accounts",
            client_id: process.env.REVOLUT_CLIENT_ID || "",
        });

        console.log("Token request URL:", tokenUrl);
        console.log("Token request data:", tokenData.toString());
        console.log("REVOLUT_CLIENT_ID:", process.env.REVOLUT_CLIENT_ID);

        // Load certificates
        const cert = fs.readFileSync(path.resolve("certs/transport.pem"));
        const key = fs.readFileSync(path.resolve("certs/private.key"));

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

        console.log("Token response status:", tokenResponse.status);
        console.log(
            "Token response data:",
            JSON.stringify(tokenResponse.data, null, 2),
        );

        if (!tokenResponse.data.access_token) {
            throw new Error("Failed to obtain access token");
        }
        const { access_token } = tokenResponse.data;

        // Step 2: Create account access consent
        console.log("Creating account access consent...");
        const consentUrl =
            "https://sandbox-oba.revolut.com/account-access-consents";

        const consentData = {
            Data: {
                Permissions: ["ReadAccountsBasic", "ReadAccountsDetail"],
                ExpirationDateTime: "2024-12-02T00:00:00+00:00",
                TransactionFromDateTime: "2024-09-03T00:00:00+00:00",
                TransactionToDateTime: "2024-12-03T00:00:00+00:00",
            },
            Risk: {},
        };

        console.log("Consent request URL:", consentUrl);
        console.log(
            "Consent request data:",
            JSON.stringify(consentData, null, 2),
        );

        const consentResponse = await axios.post(consentUrl, consentData, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`,
                "x-fapi-financial-id": "001580000103UAvAAM",
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: false, // Only for testing, remove in production
            }),
        });

        console.log("Consent response status:", consentResponse.status);
        console.log(
            "Consent response data:",
            JSON.stringify(consentResponse.data, null, 2),
        );

        if (
            !consentResponse.data.Data || !consentResponse.data.Data.ConsentId
        ) {
            throw new Error("Failed to obtain ConsentId");
        }

        // Step 3: Create JWT URL parameter
        const consentId = consentResponse.data.Data.ConsentId;
        const jwtUrlParameter = createJwtUrlParameter(consentId);

        console.log("JWT URL Parameter:", jwtUrlParameter);

        // Step 4: Create authorization URL
        const authorizationUrl = createAuthorizationUrl(jwtUrlParameter);

        console.log("Authorization URL:", authorizationUrl);

        return new Response(
            JSON.stringify({
                consentData: consentResponse.data,
                authorizationUrl: authorizationUrl,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        console.error("Error in consent creation:", error);

        let errorMessage = "An unexpected error occurred";
        let statusCode = 500;

        if (axios.isAxiosError(error)) {
            console.error("Axios error details:", {
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers,
            });
            errorMessage = error.message;
            statusCode = error.response?.status || 500;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        console.error(
            "Detailed error:",
            JSON.stringify(error, Object.getOwnPropertyNames(error)),
        );
        console.error("Stack trace:", error.stack);

        return new Response(JSON.stringify({ error: errorMessage }), {
            status: statusCode,
            headers: { "Content-Type": "application/json" },
        });
    } finally {
        console.log("POST function completed");
    }
}

// Function to create JWT URL parameter
function createJwtUrlParameter(consentId: string) {
    const header = {
        alg: "PS256",
        kid: process.env.REVOLUT_KID || "",
    };

    const payload = {
        response_type: "code id_token",
        client_id: process.env.REVOLUT_CLIENT_ID || "",
        redirect_uri: process.env.REVOLUT_REDIRECT_URI || "",
        scope: "accounts",
        state: "someRandomState", // You might want to generate this dynamically
        claims: {
            id_token: {
                openbanking_intent_id: {
                    value: consentId,
                },
            },
        },
    };

    const privateKey = fs.readFileSync(path.resolve("certs/private.key"));

    const token = jwt.sign(payload, privateKey, {
        algorithm: "PS256",
        header: header,
    });

    return token;
}

// New function to create the authorization URL
function createAuthorizationUrl(jwtUrlParameter: string) {
    const baseUrl = "https://sandbox-oba.revolut.com/ui/index.html";
    const params = new URLSearchParams({
        response_type: "code id_token",
        scope: "accounts",
        redirect_uri:
            `https://revolut.com/app/${process.env.REVOLUT_CLIENT_ID}`,
        client_id: process.env.REVOLUT_CLIENT_ID || "",
        request: jwtUrlParameter,
        response_mode: "fragment", // Optional: for more secure parameter passing
    });

    return `${baseUrl}?${params.toString()}`;
}

// Add an OPTIONS handler for preflight requests
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
