import https from "https";
import axios from "axios";
import fs from "fs";
import path from "path";
import { getRevolutAccessToken } from "../../utils/revolut-token-manager";

async function initiatePayment(accessToken: string, paymentDetails: any) {
    const paymentUrl = "https://sandbox-oba.revolut.com/domestic-payments";
    const cert = fs.readFileSync(path.resolve("certs/transport.pem"));
    const key = fs.readFileSync(path.resolve("certs/private.key"));

    try {
        const paymentResponse = await axios.post(paymentUrl, paymentDetails, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "x-fapi-financial-id": "001580000103UAvAAM",
                "x-idempotency-key": Date.now().toString(),
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
                rejectUnauthorized: false,
            }),
        });

        console.log("Payment response:", paymentResponse.data);
        return paymentResponse.data;
    } catch (error) {
        console.error(
            "Error initiating payment:",
            error.response ? error.response.data : error.message,
        );
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        const paymentDetails = await req.json();
        console.log(
            "Received payment details:",
            JSON.stringify(paymentDetails, null, 2),
        );

        const accessToken = await getRevolutAccessToken();
        if (!accessToken) {
            return new Response(
                JSON.stringify({
                    error: "No valid Revolut access token found",
                }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        console.log("Using Revolut access token:", accessToken);

        const payment = await initiatePayment(accessToken, paymentDetails);
        console.log(
            "Payment initiated successfully:",
            JSON.stringify(payment, null, 2),
        );

        return new Response(JSON.stringify(payment), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Server-side error:", error);
        const statusCode = error.response ? error.response.status : 500;
        const errorMessage = error.response
            ? error.response.data
            : error.message;
        return new Response(
            JSON.stringify({
                error: "An error occurred while processing the payment",
                details: errorMessage,
            }),
            {
                status: statusCode,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}

// This function should be implemented to retrieve the stored Revolut access token
async function getStoredRevolutAccessToken() {
    // Implement token retrieval logic here
    // This could involve fetching from a database, a secure key-value store, etc.
    // For now, we'll return null to indicate no token is available
    return null;
}
