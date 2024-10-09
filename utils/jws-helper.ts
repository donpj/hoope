import crypto from "crypto";
import base64url from "base64url";
import jwt from "jsonwebtoken";

const PRIVATE_KEY = process.env.REVOLUT_PRIVATE_KEY || "";
const KID = process.env.REVOLUT_KID || "";
const JWKS_URL = process.env.REVOLUT_JWKS_URL || "";

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

    if (!PRIVATE_KEY) {
        throw new Error(
            "REVOLUT_PRIVATE_KEY is not set in environment variables",
        );
    }

    const signature = crypto.createSign("RSA-SHA256")
        .update(`${encodedHeader}.${encodedPayload}`)
        .sign({
            key: PRIVATE_KEY,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        });

    const encodedSignature = base64url(signature);

    return `${encodedHeader}..${encodedSignature}`;
}

export function createAuthorizationJwt(
    consentId: string,
    state: string,
): string {
    if (!PRIVATE_KEY) {
        throw new Error(
            "REVOLUT_PRIVATE_KEY is not set in environment variables",
        );
    }

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

    return jwt.sign(payload, PRIVATE_KEY, options);
}
