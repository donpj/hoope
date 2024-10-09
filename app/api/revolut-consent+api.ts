import https from "https";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Next.js API route handler for Revolut consent creation
export async function POST(request: Request) {
    try {
        const body = await request.text();
        validateUrls();
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message, stack: error.stack }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
    try {
        const cert = process.env.REVOLUT_CERT;
        const key = process.env.REVOLUT_PRIVATE_KEY;

        if (!cert || !key) {
            throw new Error(
                "SSL certificate or private key not found in environment variables",
            );
        }

        if (
            !cert.includes("-----BEGIN CERTIFICATE-----") ||
            !key.includes("-----BEGIN PRIVATE KEY-----")
        ) {
            console.error(
                "Certificate or key does not have the expected PEM format",
            );
            console.log(
                "REVOLUT_CERT (first 50 chars):",
                cert?.substring(0, 50),
            );
            console.log(
                "REVOLUT_PRIVATE_KEY (first 50 chars):",
                key?.substring(0, 50),
            );
            throw new Error("Invalid certificate or key format");
        }

        // Step 1: Generate client credentials token
        console.log("Generating client credentials token...");
        const tokenUrl = `${process.env.REVOLUT_HOST}/token`;
        const tokenData = new URLSearchParams({
            grant_type: "client_credentials",
            scope: "openid accounts",
            client_id: process.env.REVOLUT_CLIENT_ID || "",
        });

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
        const consentUrl = `${process.env.REVOLUT_URL}/account-access-consents`;

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
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
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

        // Step 4: Create authorization URL
        const authorizationUrl = createAuthorizationUrl(jwtUrlParameter);

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
        console.error("Detailed error in POST function:", error);
        return new Response(
            JSON.stringify({ error: error.message, stack: error.stack }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}

// Function to create JWT URL parameter
function createJwtUrlParameter(consentId: string) {
    const header = {
        alg: "PS256",
        kid: process.env.REVOLUT_KID || "",
        typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: process.env.REVOLUT_CLIENT_ID,
        aud: process.env.REVOLUT_CLIENT_ID,
        response_type: "code id_token",
        client_id: process.env.REVOLUT_CLIENT_ID || "",
        redirect_uri: process.env.REVOLUT_HOST || "",
        scope: "accounts",
        state: crypto.randomBytes(16).toString("hex"),
        claims: {
            id_token: {
                acr: {
                    essential: true,
                    values: ["urn:openbanking:psd2:sca"],
                },
                openbanking_intent_id: {
                    essential: true,
                    value: consentId,
                },
            },
        },
        iat: now,
        exp: now + 300, // Token expires in 5 minutes
    };

    const privateKey = process.env.REVOLUT_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("Private key not found in environment variables");
    }

    const token = jwt.sign(payload, privateKey, {
        algorithm: "PS256",
        header: header,
    });

    console.log("Generated JWT:", token);

    return token;
}

// New function to create the authorization URL
function createAuthorizationUrl(jwtUrlParameter: string) {
    const baseUrl = `${process.env.REVOLUT_URL}/ui/index.html`;
    console.log("Authorization URL base:", baseUrl);
    const params = new URLSearchParams({
        response_type: "code id_token",
        scope: "accounts",
        redirect_uri: process.env.REVOLUT_REDIRECT_URI || "",
        client_id: process.env.REVOLUT_CLIENT_ID || "",
        request: jwtUrlParameter,
        response_mode: "fragment",
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

// Function to validate URLs
function validateUrls() {
    const urlVars = [
        "REVOLUT_HOST",
        "REVOLUT_URL",
        "REVOLUT_JWKS_URL",
        "REVOLUT_REDIRECT_URI",
        "REVOLUT_API_URL",
    ];
    urlVars.forEach((varName) => {
        const url = process.env[varName];
        if (!url) {
            throw new Error(`${varName} is not set`);
        }
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`Invalid ${varName}: ${url}`);
        }
    });
}
