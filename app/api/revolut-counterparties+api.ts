import { getRevolutAccessToken } from "@/utils/revolut-token-manager";
import axios from "axios";

export async function GET(request: Request) {
    console.log("[Server] GET request received");
    try {
        const accessToken = await getRevolutAccessToken();
        console.log("[Server] Access token available:", !!accessToken);

        if (!accessToken) {
            console.error("[Server] No valid access token available");
            return new Response(
                JSON.stringify({ error: "No valid access token available" }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const counterpartiesUrl =
            //`${process.env.REVOLUT_BUSINESS_URL}/counterparties`;
            "https://sandbox-b2b.revolut.com/api/1.0/counterparties?name=John%20Smith&account_no=12345678";
        console.log("Counterparties URL:", counterpartiesUrl);
        console.log(
            "Access Token (first 10 chars):",
            accessToken.substring(0, 10) + "...",
        );

        const response = await axios.get(counterpartiesUrl, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/json",
            },
        });

        console.log(
            "[Server] Counterparties response status:",
            response.status,
        );
        console.log(
            "[Server] Counterparties response data:",
            JSON.stringify(response.data, null, 2),
        );

        return new Response(JSON.stringify(response.data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("[Server] Error in API:", error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("  Response status:", error.response.status);
            console.error(
                "  Response data:",
                JSON.stringify(error.response.data, null, 2),
            );
            console.error("  Request URL:", error.config?.url);
            console.error(
                "  Request Headers:",
                JSON.stringify(error.config?.headers, null, 2),
            );
        }
        return new Response(
            JSON.stringify({
                error: "Failed to fetch counterparties",
                details: error.message,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}
