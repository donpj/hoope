import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";
import { createJws } from "@/utils/jws-helper";
import jwt from "jsonwebtoken";
import { REVOLUT_CA_CERT } from "@/app/api/revolut-ca-cert";

export async function POST(request: Request) {
  console.log("Revolut payments consent API route called");
  try {
    validateUrls();
    const requestBody = await request.json();
    console.log(
      "Payment consent request body:",
      JSON.stringify(requestBody, null, 2)
    );

    const cert = process.env.REVOLUT_CERT;
    const key = process.env.REVOLUT_PRIVATE_KEY;
    //const ca = REVOLUT_CA_CERT;

    //const ca = process.env.REVOLUT_CA_CERT;

    if (!cert || !key) {
      throw new Error(
        "SSL certificate or private key not found in environment variables"
      );
    }

    const httpsAgent = new https.Agent({
      cert: cert,
      key: key,
      rejectUnauthorized: false,
    });

    // Step 1: Get client credentials token
    const tokenUrl = `${process.env.REVOLUT_HOST}/token`;
    const tokenData = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "openid payments",
      client_id: process.env.REVOLUT_CLIENT_ID || "",
    });

    console.log("Token request data:", tokenData.toString());
    console.log("REVOLUT_CLIENT_ID:", process.env.REVOLUT_CLIENT_ID);
    console.log("REVOLUT_HOST:", process.env.REVOLUT_HOST);

    const tokenResponse = await axios.post(tokenUrl, tokenData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      httpsAgent: httpsAgent,
    });

    console.log("Token response:", tokenResponse.data);

    const { access_token } = tokenResponse.data;
    if (!access_token) {
      throw new Error("Failed to obtain access token");
    }

    // Step 2: Create payment consent
    const consentUrl = `${process.env.REVOLUT_URL}/domestic-payment-consents`;
    const jws = createJws(requestBody);
    console.log("Generated JWS:", jws);

    const consentResponse = await axios.post(consentUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "x-fapi-financial-id": "001580000103UAvAAM",
        "x-idempotency-key": Date.now().toString(),
        "x-jws-signature": jws,
      },
      httpsAgent: httpsAgent,
    });

    console.log("Consent response status:", consentResponse.status);
    console.log("Consent response headers:", consentResponse.headers);
    console.log("Consent response data:", consentResponse.data);

    // Step 3: Create authorization URL
    const authorizationUrl = createAuthorizationUrl(
      consentResponse.data.Data.ConsentId
    );
    console.log("Authorization URL:", authorizationUrl);

    return new Response(
      JSON.stringify({
        consentData: consentResponse.data,
        authorizationUrl: authorizationUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating payment consent:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function createAuthorizationUrl(consentId: string) {
  const baseUrl = `${process.env.REVOLUT_URL}/ui/index.html`;
  const clientId = process.env.REVOLUT_CLIENT_ID;
  const redirectUri = process.env.REVOLUT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("Missing REVOLUT_CLIENT_ID or REVOLUT_REDIRECT_URI");
    throw new Error("Missing required environment variables");
  }

  const privateKeyPath = path.resolve("certs/private.key");
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");

  const payload = {
    iss: clientId,
    aud: `${process.env.REVOLUT_HOST}`,
    response_type: "code id_token",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "payments",
    state: consentId,
    nonce: Date.now().toString(),
    claims: {
      id_token: {
        acr: {
          essential: true,
          values: ["urn:openbanking:psd2:sca"],
        },
        openbanking_intent_id: {
          essential: true,
          value: consentId,
        },
      },
    },
  };

  const requestJwt = jwt.sign(payload, process.env.REVOLUT_PRIVATE_KEY || "", {
    algorithm: "PS256",
    expiresIn: "1h",
    header: {
      typ: "JWT",
      alg: "PS256",
      kid: process.env.REVOLUT_KID,
    },
  });

  const params = new URLSearchParams({
    response_type: "code id_token",
    scope: "payments",
    redirect_uri: redirectUri,
    client_id: clientId,
    state: consentId,
    request: requestJwt,
  });

  return `${baseUrl}?${params.toString()}`;
}

function validateUrls() {
  const urlVars = ["REVOLUT_HOST", "REVOLUT_URL", "REVOLUT_REDIRECT_URI"];
  urlVars.forEach((varName) => {
    const url = process.env[varName];
    if (!url) {
      throw new Error(`${varName} is not set`);
    }
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid ${varName}: ${url}`);
    }
  });
}

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
