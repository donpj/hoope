import { createAuthorizationJwt } from "@/utils/jws-helper";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { consentId, state } = await request.json();

        if (!consentId || !state) {
            return NextResponse.json({ error: "Missing consentId or state" }, {
                status: 400,
            });
        }

        console.log("REVOLUT_CLIENT_ID:", process.env.REVOLUT_CLIENT_ID);
        console.log("REVOLUT_REDIRECT_URI:", process.env.REVOLUT_REDIRECT_URI);
        console.log("REVOLUT_KID:", process.env.REVOLUT_KID);

        const jwt = createAuthorizationJwt(consentId, state);

        return NextResponse.json({ jwt }, { status: 200 });
    } catch (error) {
        console.error("Error creating authorization JWT:", error);
        return NextResponse.json(
            {
                error: "Failed to create authorization JWT",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: "This endpoint only accepts POST requests",
    }, { status: 405 });
}
