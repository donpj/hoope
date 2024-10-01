import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@1.30.0";

// Load environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const revolutClientId = Deno.env.get("REVOLUT_CLIENT_ID")!;
const revolutFinancialId = Deno.env.get("REVOLUT_FINANCIAL_ID")!;

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
    const requestBody = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "accounts",
      client_id: revolutClientId,
    }).toString();

    const requestHeaders =
      `POST /token HTTP/1.1\r\nHost: sandbox-oba-auth.revolut.com\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${requestBody.length}\r\n\r\n`;

    await conn.write(encoder.encode(requestHeaders + requestBody));

    console.log("Request sent successfully");

    const decoder = new TextDecoder();
    let responseText = "";
    let buffer = new Uint8Array(1024);
    while (true) {
      const bytesRead = await conn.read(buffer);
      if (bytesRead === null) break;
      responseText += decoder.decode(buffer.subarray(0, bytesRead));
    }

    conn.close();

    console.log("Response received:", responseText.substring(0, 100) + "..."); // Log first 100 characters of response

    // Parse the response to get the access token
    const responseLines = responseText.split("\r\n");
    const jsonResponse = JSON.parse(responseLines[responseLines.length - 1]);
    const accessToken = jsonResponse.access_token;

    if (!accessToken) {
      throw new Error("Failed to obtain access token");
    }

    console.log("Access Token obtained successfully");

    // Step 2: Create Account Access Consent
    console.log("Starting Step 2");

    const consentConn = await Deno.connectTls({
      hostname: "sandbox-oba.revolut.com",
      port: 443,
      certChain: transportCert,
      privateKey: privateKey,
      caCerts: [caCertRoot, caCertIssuing],
    });

    console.log("TLS connection for Step 2 established successfully");

    const consentRequestBody = JSON.stringify({
      Data: {
        Permissions: [
          "ReadAccountsBasic",
          "ReadAccountsDetail",
        ],
        ExpirationDateTime: "2025-12-02T00:00:00+00:00",
        TransactionFromDateTime: "2023-09-03T00:00:00+00:00",
        TransactionToDateTime: "2025-12-03T00:00:00+00:00",
      },
      Risk: {},
    });

    const consentRequestHeaders = `POST /account-access-consents HTTP/1.1\r\n` +
      `Host: sandbox-oba.revolut.com\r\n` +
      `x-fapi-financial-id: ${revolutFinancialId}\r\n` +
      `Authorization: Bearer ${accessToken}\r\n` +
      `Content-Type: application/json\r\n` +
      `Content-Length: ${consentRequestBody.length}\r\n\r\n`;

    await consentConn.write(
      encoder.encode(consentRequestHeaders + consentRequestBody),
    );

    console.log("Consent request sent successfully");

    let consentResponseText = "";
    while (true) {
      const bytesRead = await consentConn.read(buffer);
      if (bytesRead === null) break;
      consentResponseText += decoder.decode(buffer.subarray(0, bytesRead));
    }

    consentConn.close();

    console.log(
      "Consent response received:",
      consentResponseText.substring(0, 100) + "...",
    ); // Log first 100 characters of response

    return new Response(
      JSON.stringify({
        success: true,
        step1Response: responseText,
        step2Response: consentResponseText,
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
