import { NextResponse } from 'next/server';
import { nylas } from "@/lib/nylas";
import { db } from '@/server/db';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const userId = cookies().get('userId')?.value
    if (!userId) {
        return NextResponse.json({ error: "No user ID found" }, { status: 400 });
    }

    console.log("Received callback from Nylas");
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: "No authorization code returned from Nylas" }, { status: 400 });
    }

    const codeExchangePayload = {
        clientSecret: process.env.NYLAS_API_KEY as string,
        clientId: process.env.NYLAS_CLIENT_ID as string,
        redirectUri: `${process.env.NEXT_PUBLIC_URL}/api/auth/callback/nylas`,
        code,
    };

    try {
        const response = await nylas.auth.exchangeCodeForToken(codeExchangePayload);
        const { grantId } = response;

        const token = crypto.randomUUID()

        await db.grant.create({
            data: {
                id: grantId,
                token,
                userId,
            }
        })

        return NextResponse.json({ message: "OAuth2 flow completed successfully for grant ID: " + grantId });
    } catch (error) {
        return NextResponse.json({ error: "Failed to exchange authorization code for token" }, { status: 500 });
    }
}