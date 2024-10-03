import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";
import { createJws } from "@/utils/jws-helper";
import jwt from "jsonwebtoken";

const agent = new https.Agent({
    cert: fs.readFileSync(path.resolve("certs/transport.pem")),
    key: fs.readFileSync(path.resolve("certs/private.key")),
    rejectUnauthorized: false, // Only for testing, remove in production
});

export async function POST(request: Request) {
    try {
        const requestBody = await request.json();
        console.log(
            "Payment consent request body:",
            JSON.stringify(requestBody, null, 2),
        );

        // Step 1: Get client credentials token
        const tokenUrl = "https://sandbox-oba-auth.revolut.com/token";
        const tokenData = new URLSearchParams({
            grant_type: "client_credentials",
            scope: "openid payments",
            client_id: process.env.REVOLUT_CLIENT_ID || "",
        });

        console.log("Token request data:", tokenData.toString());
        console.log("REVOLUT_CLIENT_ID:", process.env.REVOLUT_CLIENT_ID);

        const tokenResponse = await axios.post(tokenUrl, tokenData, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            httpsAgent: agent,
        });

        const { access_token } = tokenResponse.data;
        if (!access_token) {
            throw new Error("Failed to obtain access token");
        }

        // Step 2: Create payment consent
        const consentUrl =
            "https://sandbox-oba.revolut.com/domestic-payment-consents";
        const jws = createJws(requestBody);
        console.log("Generated JWS:", jws);

        const consentResponse = await axios.post(consentUrl, requestBody, {
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json",
                "x-fapi-financial-id": "001580000103UAvAAM",
                "x-idempotency-key": Date.now().toString(),
                "x-jws-signature": jws,
            },
            httpsAgent: agent,
        });

        console.log("Consent response status:", consentResponse.status);
        console.log("Consent response headers:", consentResponse.headers);
        console.log("Consent response data:", consentResponse.data);

        // Step 3: Create authorization URL
        const authorizationUrl = createAuthorizationUrl(
            consentResponse.data.Data.ConsentId,
        );
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
        console.error("Error creating payment consent:", error);
        return new Response(
            JSON.stringify({
                error: "Failed to create payment consent",
                details: error.response ? error.response.data : error.message,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}

function createAuthorizationUrl(consentId: string) {
    const baseUrl = "https://sandbox-oba.revolut.com/ui/index.html";
    const clientId = process.env.REVOLUT_CLIENT_ID;
    const redirectUri = process.env.REVOLUT_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        console.error("Missing REVOLUT_CLIENT_ID or REVOLUT_REDIRECT_URI");
        throw new Error("Missing required environment variables");
    }

    const privateKeyPath = path.resolve("certs/private.key");
    const privateKey = fs.readFileSync(privateKeyPath, "utf8");

    const payload = {
        iss: clientId,
        aud: "https://sandbox-oba.revolut.com",
        response_type: "code id_token",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "payments",
        state: consentId,
        nonce: Date.now().toString(),
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
    };

    const requestJwt = jwt.sign(payload, privateKey, {
        algorithm: "PS256",
        expiresIn: "1h",
        header: {
            typ: "JWT",
            alg: "PS256",
            kid: process.env.REVOLUT_KID,
        },
    });

    const params = new URLSearchParams({
        response_type: "code id_token",
        scope: "payments",
        redirect_uri: redirectUri,
        client_id: clientId,
        state: consentId,
        request: requestJwt,
    });

    return `${baseUrl}?${params.toString()}`;
}
