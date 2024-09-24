import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@1.30.0";

console.log("Starting the function...");

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const revolutClientId = Deno.env.get("REVOLUT_CLIENT_ID")!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseKey);
console.log("Revolut Client ID:", revolutClientId);
console.log("Environment Variables:", Deno.env.toObject());

serve(async (req: Request) => {
  try {
    console.log("Parsing request body...");
    const { userId } = await req.json();

    if (!userId) {
      console.log("Missing userId");
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      });
    }

    console.log("Fetching client credentials token...");
    const clientTokenResponse = await fetch(
      "https://sandbox-oba-auth.revolut.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: "accounts",
          client_id: revolutClientId,
        }),
      },
    );

    const clientTokenData = await clientTokenResponse.json();
    console.log("Received client token response", clientTokenData);
    const accessToken = clientTokenData.access_token;

    if (!accessToken) {
      console.log("Failed to get client credentials token");
      return new Response(
        JSON.stringify({ error: "Failed to get client credentials token" }),
        { status: 400 },
      );
    }

    console.log("Creating account access consent...");
    const consentResponse = await fetch(
      "https://sandbox-oba.revolut.com/account-access-consents",
      {
        method: "POST",
        headers: {
          "x-fapi-financial-id": "001580000103UAvAAM",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Data: {
            Permissions: ["ReadAccountsBasic", "ReadAccountsDetail"],
            ExpirationDateTime: "2024-12-02T00:00:00+00:00",
            TransactionFromDateTime: "2024-01-01T00:00:00+00:00",
            TransactionToDateTime: "2024-12-31T00:00:00+00:00",
          },
          Risk: {},
        }),
      },
    );

    const consentData = await consentResponse.json();
    console.log("Consent response data:", consentData);
    const consentId = consentData?.Data?.ConsentId;

    if (!consentId) {
      console.log("Failed to create account access consent");
      return new Response(
        JSON.stringify({ error: "Failed to create account access consent" }),
        { status: 400 },
      );
    }

    return new Response(JSON.stringify({ success: true, consentId }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error in Revolut OAuth flow:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});
