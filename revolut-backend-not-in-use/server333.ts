// server.js
require("dotenv").config();
const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Endpoint to create Revolut consent
app.post("/api/revolut-consent", async (req, res) => {
    try {
        console.log("Starting consent creation process");

        // Load certificates and keys securely
        const key = fs.readFileSync(path.resolve("certs/private.key"));
        const cert = fs.readFileSync(path.resolve("certs/transport.pem"));
        const ca = [
            fs.readFileSync(path.resolve("certs/root.pem")),
            fs.readFileSync(path.resolve("certs/issuing.pem")),
        ];

        // Create an HTTPS Agent with the certificates
        const agent = new https.Agent({
            key: key,
            cert: cert,
            ca: ca,
            //rejectUnauthorized: false,
        });

        // Step 1: Generate client credentials token
        console.log("Generating client credentials token...");
        const tokenOptions = {
            hostname: "oba-auth.revolut.com",
            port: 443,
            path: "/token",
            method: "POST",
            agent: agent,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        };

        const tokenRequestBody = new URLSearchParams({
            grant_type: "client_credentials",
            scope: "accounts",
            client_id: process.env.REVOLUT_CLIENT_ID || "", // Ensure this is set in your environment variables
        }).toString();

        const tokenResponse = await makeHttpsRequest(
            tokenOptions,
            tokenRequestBody,
        );
        console.log(
            "Token response received:",
            JSON.stringify(tokenResponse, null, 2),
        );

        if (!tokenResponse.access_token) {
            throw new Error("Failed to obtain access token");
        }
        const { access_token } = tokenResponse;

        // Step 2: Create account access consent
        console.log("Creating account access consent...");
        const consentOptions = {
            hostname: "sandbox-oba.revolut.com",
            port: 443,
            path: "/account-access-consents",
            method: "POST",
            agent: agent,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`,
                "x-fapi-financial-id": "001580000103UAvAAM", // Replace with your Financial ID if different
            },
        };

        // Generate dynamic dates for the consent
        const now = new Date();
        const expirationDate = new Date(
            now.getFullYear() + 1,
            now.getMonth(),
            now.getDate(),
        ).toISOString();
        const transactionFromDate = now.toISOString();
        const transactionToDate = expirationDate;

        // Prepare the request body
        const requestBody = JSON.stringify({
            Data: {
                Permissions: [
                    "ReadAccountsBasic",
                    "ReadAccountsDetail",
                ],
                ExpirationDateTime: expirationDate,
                TransactionFromDateTime: transactionFromDate,
                TransactionToDateTime: transactionToDate,
            },
            Risk: {},
        });

        console.log("Consent request body:", requestBody); // Log the request body

        // Make the HTTPS request with mutual TLS
        const consentResponse = await makeHttpsRequest(
            consentOptions,
            requestBody,
        );
        console.log(
            "Consent response received:",
            JSON.stringify(consentResponse, null, 2),
        );

        if (!consentResponse.Data || !consentResponse.Data.ConsentId) {
            throw new Error("Failed to create account access consent");
        }

        // Return the consent response to the client
        res.status(200).json(consentResponse);
    } catch (error) {
        console.error("Error in consent creation:", error);

        let errorMessage = "An unexpected error occurred";
        let statusCode = 500;

        if (
            error instanceof Error &&
            error.message.includes("connect")
        ) {
            errorMessage =
                "Failed to connect to the Revolut API. Please check your network connection and try again.";
            statusCode = 503; // Service Unavailable
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        console.error(
            "Detailed error:",
            JSON.stringify(error, Object.getOwnPropertyNames(error)),
        );
        console.error("Stack trace:", error.stack);

        res.status(statusCode).json({ error: errorMessage });
    }
});

// Helper function to make HTTPS requests
function makeHttpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(
                            new Error(
                                `HTTP Error ${res.statusCode}: ${
                                    JSON.stringify(parsedData)
                                }`,
                            ),
                        );
                    } else {
                        resolve(parsedData);
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });

        req.on("error", (e) => {
            console.error("Request error:", e);
            reject(e);
        });

        req.write(body);
        req.end();
    });
}

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Backend server is running on port ${port}`);
});
