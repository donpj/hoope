import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@1.30.0";

// Load environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const revolutClientId = Deno.env.get("REVOLUT_CLIENT_ID")!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Supabase URL:", supabaseUrl);
console.log("Revolut Client ID:", revolutClientId);

serve(async (req: Request) => {
  try {
    console.log("Request received");
    const { userId } = await req.json();
    console.log("User ID:", userId);

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

    console.log("Response Status: ", clientTokenResponse.status);
    if (!clientTokenResponse.ok) {
      console.error("Error fetching token:", clientTokenResponse.statusText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch token" }),
        { status: clientTokenResponse.status },
      );
    }

    const clientTokenData = await clientTokenResponse.json();
    console.log("Revolut Token Response:", clientTokenData);
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
          Authorization: `Bearer ${accessToken}`,
          "x-fapi-financial-id": "001580000103UAvAAM",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Data: {
            Permissions: ["ReadAccountsBasic", "ReadAccountsDetail"],
            ExpirationDateTime: "2024-12-31T00:00:00+00:00",
            TransactionFromDateTime: "2024-01-01T00:00:00+00:00",
            TransactionToDateTime: "2024-12-31T00:00:00+00:00",
          },
          Risk: {},
        }),
      },
    );

    if (!consentResponse.ok) {
      console.error("Error creating consent:", consentResponse.statusText);
      return new Response(
        JSON.stringify({ error: "Failed to create consent" }),
        { status: consentResponse.status },
      );
    }

    const consentData = await consentResponse.json();
    console.log("Consent Response Data:", consentData);
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
