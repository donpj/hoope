import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@1.30.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const revolutClientId = Deno.env.get("REVOLUT_CLIENT_ID")!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Starting the function...");

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

    // Download the required certificates and key from Supabase
    const transportCert = await downloadFile("transport.pem");
    const privateKey = await downloadFile("private.key");
    const caCertRoot = await downloadFile("root.pem");
    const caCertIssuing = await downloadFile("issuing.pem");

    // Establish a manual TLS connection
    const tlsConn = await Deno.connectTls({
      hostname: "sandbox-oba-auth.revolut.com",
      port: 443,
      certChain: transportCert,
      privateKey: privateKey,
      caCerts: [caCertRoot, caCertIssuing],
    });

    // Prepare the POST data for OAuth token request
    const requestBody = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "accounts",
      client_id: revolutClientId,
    }).toString();

    // Create the HTTP request manually
    const requestHeaders = `POST /token HTTP/1.1\r\n` +
      `Host: sandbox-oba-auth.revolut.com\r\n` +
      `Content-Type: application/x-www-form-urlencoded\r\n` +
      `Content-Length: ${requestBody.length}\r\n\r\n`;

    const encoder = new TextEncoder();
    await tlsConn.write(encoder.encode(requestHeaders + requestBody));

    // Read the response
    const decoder = new TextDecoder();
    let responseText = "";
    const buffer = new Uint8Array(1024);

    while (true) {
      const bytesRead = await tlsConn.read(buffer);
      if (bytesRead === null) break;
      responseText += decoder.decode(buffer.subarray(0, bytesRead));
      if (responseText.includes("\r\n\r\n")) break; // End of headers
    }

    // Parse the response
    const [headers, body] = responseText.split("\r\n\r\n");
    const statusLine = headers.split("\r\n")[0];
    const statusCode = parseInt(statusLine.split(" ")[1]);

    console.log("Response status:", statusCode);
    console.log("Response body:", body);

    await tlsConn.close();

    return new Response(JSON.stringify({ success: true, data: body }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in OAuth flow:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
      },
    );
  }
});
