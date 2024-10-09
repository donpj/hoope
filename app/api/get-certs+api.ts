import { NextResponse } from "next/server";

export async function GET(request: Request) {
    console.log("GET /api/get-certs called");
    const transportCert = process.env.NETLIFY_FUNCTION_TRANSPORT_CERT;
    const privateKey = process.env.NETLIFY_FUNCTION_PRIVATE_KEY;

    console.log("Transport cert available:", !!transportCert);
    console.log("Private key available:", !!privateKey);

    if (!transportCert || !privateKey) {
        console.log("Certificates not found");
        return NextResponse.json({ error: "Certificates not found" }, {
            status: 500,
        });
    }

    console.log("Returning certificates");
    return NextResponse.json({
        transportCert: Buffer.from(transportCert).toString("base64"),
        privateKey: Buffer.from(privateKey).toString("base64"),
    });
}
