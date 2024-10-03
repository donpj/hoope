import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";
import { createJws } from "@/utils/jws-helper";

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

        return new Response(JSON.stringify(consentResponse.data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error creating payment consent:", error);
        return new Response(
            JSON.stringify({
                error: "Failed to create payment consent",
                details: error.response ? error.response.data : error.message,
                stack: error.stack,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}
