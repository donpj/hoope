import https from "https";
import axios from "axios";
import fs from "fs";
import path from "path";
import { createJws } from "../../utils/jws-helper";

async function exchangeCodeForToken(code: string) {
    const tokenUrl = `${process.env.REVOLUT_HOST}/token`;
    const tokenData = new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REVOLUT_REDIRECT_URI || "",
        client_id: process.env.REVOLUT_CLIENT_ID || "",
    });

    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;

    try {
        const response = await axios.post(tokenUrl, tokenData, {
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

        console.log("Token exchange response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error exchanging code for token:", error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
        throw error;
    }
}

async function initiatePayment(accessToken: string, paymentDetails: any) {
    const paymentUrl = `${process.env.REVOLUT_URL}/domestic-payments`;
    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;

    // Generate JWS signature
    const jwsSignature = createJws(paymentDetails);

    console.log(
        "Initiating payment with details:",
        JSON.stringify(paymentDetails, null, 2),
    );
    10;
    console.log("Using access token:", accessToken);

    try {
        const paymentResponse = await axios.post(paymentUrl, paymentDetails, {
            headers: {
                "Authorization": `Bearer ${accessToken}`, // Use the correct access token
                "Content-Type": "application/json",
                "x-fapi-financial-id": "001580000103UAvAAM",
                "x-idempotency-key": Date.now().toString(),
                "x-jws-signature": jwsSignature,
            },
            httpsAgent: new https.Agent({
                cert: cert,
                key: key,
            }),
        });

        console.log("Payment response:", paymentResponse.data);
        return paymentResponse.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            const responseData = error.response.data;
            if (responseData.Code === 1006) {
                console.error("Insufficient funds:", responseData.Message);
                throw new Error("Insufficient funds: " + responseData.Message);
            }
        }
        console.error(
            "Error initiating payment:",
            error.response ? error.response.data : error.message,
        );
        throw error;
    }
}

export async function POST(req: Request) {
    console.log("POST function called");

    try {
        const body = await req.json();
        console.log("Received request body:", JSON.stringify(body, null, 2));

        const { action, code, paymentDetails, consentId, accessToken } = body;

        switch (action) {
            case "exchangeToken":
                const tokenResponse = await exchangeCodeForToken(code);
                return new Response(JSON.stringify(tokenResponse), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });

            case "initiatePayment":
                if (!paymentDetails || !consentId || !accessToken) {
                    throw new Error(
                        "Missing required data for payment initiation",
                    );
                }

                const fullPaymentDetails = {
                    Data: {
                        ConsentId: consentId,
                        ...paymentDetails.Data,
                    },
                    Risk: paymentDetails.Risk,
                };

                try {
                    const payment = await initiatePayment(
                        accessToken,
                        fullPaymentDetails,
                    );
                    console.log(
                        "Payment initiated successfully:",
                        JSON.stringify(payment, null, 2),
                    );

                    return new Response(JSON.stringify(payment), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                } catch (error) {
                    if (error.message.startsWith("Insufficient funds:")) {
                        return new Response(
                            JSON.stringify({ error: error.message }),
                            {
                                status: 400,
                                headers: { "Content-Type": "application/json" },
                            },
                        );
                    }
                    throw error;
                }

            default:
                return new Response(
                    JSON.stringify({ error: "Invalid action" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    },
                );
        }
    } catch (error) {
        console.error("Server-side error:", error);
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
    } finally {
        console.log("POST function completed");
    }
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
