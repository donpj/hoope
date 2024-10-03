import fs from "fs";
import path from "path";
import crypto from "crypto";
import base64url from "base64url";
import jwt from "jsonwebtoken";

const PRIVATE_KEY_PATH = path.resolve("certs/private.key");
const KID = process.env.REVOLUT_KID || ""; // Make sure to set this in your environment variables
const JWKS_URL = process.env.REVOLUT_JWKS_URL || ""; // Make sure to set this in your environment variables

export function createJws(payload: any): string {
    if (!JWKS_URL) {
        throw new Error("REVOLUT_JWKS_URL is not set in environment variables");
    }

    const jwksUrlObject = new URL(JWKS_URL);
    const tanValue = jwksUrlObject.hostname;

    const header = {
        typ: "JOSE",
        alg: "PS256",
        kid: KID,
        crit: ["http://openbanking.org.uk/tan"],
        "http://openbanking.org.uk/tan": tanValue,
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));

    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");

    const signature = crypto.createSign("RSA-SHA256")
        .update(`${encodedHeader}.${encodedPayload}`)
        .sign({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        });

    const encodedSignature = base64url(signature);

    // Return only the header and signature for the x-jws-signature header
    return `${encodedHeader}..${encodedSignature}`;
}

export function createAuthorizationJwt(
    consentId: string,
    state: string,
): string {
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
    const clientId = process.env.REVOLUT_CLIENT_ID;
    const redirectUri = process.env.REVOLUT_REDIRECT_URI;

    const payload = {
        response_type: "code id_token",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "payments",
        state: state,
        claims: {
            id_token: {
                openbanking_intent_id: {
                    value: consentId,
                },
            },
        },
    };

    const options = {
        algorithm: "PS256",
        header: {
            alg: "PS256",
            kid: KID,
        },
    };

    return jwt.sign(payload, privateKey, options);
}
