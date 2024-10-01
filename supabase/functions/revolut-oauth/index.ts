import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@1.30.0";

// Load environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const revolutClientId = Deno.env.get("REVOLUT_CLIENT_ID")!;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Starting the function...");

// Helper function to download files from Supabase storage
async function downloadFile(filename: string): Promise<string> {
    const { data, error } = await supabase.storage.from("revolut").download(
        filename,
    );
    if (error) {
        console.error(`Error downloading ${filename}:`, error.message);
        throw new Error(`File not found in storage: ${filename}`);
    }
    return await data.text();
}

serve(async (req: Request) => {
    try {
        console.log("Request received");

        // Step 1: Get Access Token
        const transportCert = await downloadFile("transport.pem");
        const privateKey = await downloadFile("private.key");
        const caCertRoot = await downloadFile("root.pem");
        const caCertIssuing = await downloadFile("issuing.pem");

        console.log("Certificates downloaded successfully");

        const conn = await Deno.connectTls({
            hostname: "sandbox-oba-auth.revolut.com",
            port: 443,
            certChain: transportCert,
            privateKey: privateKey,
            caCerts: [caCertRoot, caCertIssuing],
        });

        console.log("TLS connection established successfully");

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const requestBody = new URLSearchParams({
            grant_type: "client_credentials",
            scope: "accounts",
            client_id: revolutClientId,
        }).toString();

        const requestHeaders = `POST /token HTTP/1.1\r
Host: sandbox-oba-auth.revolut.com\r
Content-Type: application/x-www-form-urlencoded\r
Content-Length: ${requestBody.length}\r
\r
`;

        await conn.write(encoder.encode(requestHeaders + requestBody));

        console.log("Request sent successfully");

        let responseText = "";
        let buffer = new Uint8Array(1024);
        while (true) {
            const bytesRead = await conn.read(buffer);
            if (bytesRead === null) break;
            responseText += decoder.decode(buffer.subarray(0, bytesRead));
        }

        conn.close();

        console.log(
            "Response received:",
            responseText.substring(0, 100) + "...",
        ); // Log first 100 characters of response

        // Parse the response to get the access token
        const responseParts = responseText.split("\r\n\r\n");
        const responseBody = responseParts[responseParts.length - 1];
        const jsonResponse = JSON.parse(responseBody);

        if (!jsonResponse.access_token) {
            throw new Error("Failed to obtain access token");
        }

        console.log("Access Token obtained successfully");

        // Step 2: Create an account access consent
        console.log("Starting Step 2: Create an account access consent");

        const conn2 = await Deno.connectTls({
            hostname: "sandbox-oba.revolut.com",
            port: 443,
            certChain: transportCert,
            privateKey: privateKey,
            caCerts: [caCertRoot, caCertIssuing],
        });

        console.log(
            "TLS connection to sandbox-oba.revolut.com established successfully",
        );

        // Generate dynamic dates for the consent
        const now = new Date();
        const expirationDate = new Date(
            now.getFullYear() + 1,
            now.getMonth(),
            now.getDate(),
        ).toISOString();
        const transactionFromDate = now.toISOString();
        const transactionToDate = expirationDate;

        const consentRequestBody = JSON.stringify({
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

        const consentRequestHeaders = `POST /account-access-consents HTTP/1.1\r
Host: sandbox-oba.revolut.com\r
Content-Type: application/json\r
Authorization: Bearer ${jsonResponse.access_token}\r
x-fapi-financial-id: 001580000103UAvAAM\r
Content-Length: ${consentRequestBody.length}\r
\r
`;

        await conn2.write(
            encoder.encode(consentRequestHeaders + consentRequestBody),
        );

        console.log("Consent request sent successfully");

        let consentResponseText = "";
        buffer = new Uint8Array(1024);
        while (true) {
            const bytesRead = await conn2.read(buffer);
            if (bytesRead === null) break;
            consentResponseText += decoder.decode(
                buffer.subarray(0, bytesRead),
            );
        }

        conn2.close();

        console.log(
            "Consent response received:",
            consentResponseText.substring(0, 100) + "...",
        );

        // Parse the response to get the ConsentId
        const consentResponseParts = consentResponseText.split("\r\n\r\n");
        const consentResponseBody =
            consentResponseParts[consentResponseParts.length - 1];
        const consentResponseJSON = JSON.parse(consentResponseBody);

        if (
            !consentResponseJSON.Data || !consentResponseJSON.Data.ConsentId
        ) {
            throw new Error("Failed to create account access consent");
        }

        console.log("Account Access Consent created successfully");

        const consentId = consentResponseJSON.Data.ConsentId;

        // Return the access token and consent ID in the response
        return new Response(
            JSON.stringify({
                access_token: jsonResponse.access_token,
                consent_id: consentId,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        console.error("Error in OAuth flow:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error.message,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
});
