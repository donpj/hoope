import https from "https";
import axios from "axios";
import {
    getRevolutAccessToken,
    storeRevolutTokens,
} from "@/utils/revolut-token-manager";
import { NextResponse } from "next/server";
import * as revolutService from "@/services/Accounts/revolutService";
import { REVOLUT_CA_CERT } from "@/app/api/revolut-ca-cert";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const accountId = url.searchParams.get("accountId");

        if (accountId) {
            if (url.searchParams.get("balances") === "true") {
                const balance = await revolutService.retrieveAccountBalance(
                    accountId,
                );
                return NextResponse.json(balance);
            } else if (url.searchParams.get("beneficiaries") === "true") {
                const beneficiaries = await revolutService
                    .retrieveAccountBeneficiaries(accountId);
                return NextResponse.json(beneficiaries);
            } else {
                const transactions = await revolutService
                    .retrieveAccountTransactions(accountId);
                return NextResponse.json(transactions);
            }
        } else {
            const accounts = await revolutService.retrieveAllAccounts();
            return NextResponse.json(accounts);
        }
    } catch (error) {
        console.error("Error in GET request:", error);
        return NextResponse.json({
            error: "An error occurred while processing the request",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { action, code } = await request.json();

        if (action === "exchangeCode") {
            const tokenUrl = `${process.env.REVOLUT_HOST}/token`;
            const tokenData = new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: process.env.REVOLUT_REDIRECT_URI || "",
                client_id: process.env.REVOLUT_CLIENT_ID || "",
            });

            const cert = process.env.REVOLUT_CERT;
            const key = process.env.REVOLUT_PRIVATE_KEY;
            const ca = REVOLUT_CA_CERT;

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

            const { access_token, refresh_token, expires_in } =
                tokenResponse.data;

            // Store tokens
            await storeRevolutTokens(access_token, refresh_token, expires_in);

            return NextResponse.json({
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in,
            });
        } else {
            return NextResponse.json({ error: "Invalid action" }, {
                status: 400,
            });
        }
    } catch (error) {
        console.error("Error in POST request:", error);
        return NextResponse.json({
            error: "An error occurred",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url);
        const consentId = url.searchParams.get("consentId");
        if (!consentId) {
            return NextResponse.json({ error: "ConsentId is required" }, {
                status: 400,
            });
        }
        await revolutService.deleteAccountAccessConsent(consentId);
        return NextResponse.json({
            message: "Account access consent deleted successfully",
        });
    } catch (error) {
        console.error("Error in DELETE request:", error);
        return NextResponse.json({
            error: "An error occurred while deleting account access consent",
            details: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
    }
}
