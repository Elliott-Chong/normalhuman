import { NextRequest } from "next/server";
import crypto from "crypto";
import axios from "axios";
import Account from "@/lib/account";
import { db } from "@/server/db";
import { waitUntil } from "@vercel/functions";

const AURINKO_SIGNING_SECRET = process.env.AURINKO_SIGNING_SECRET;

export const POST = async (req: NextRequest) => {
    console.log("POST request received");
    const query = req.nextUrl.searchParams;
    const validationToken = query.get("validationToken");
    if (validationToken) {
        return new Response(validationToken, { status: 200 });
    }

    const timestamp = req.headers.get("X-Aurinko-Request-Timestamp");
    const signature = req.headers.get("X-Aurinko-Signature");
    const body = await req.text();

    if (!timestamp || !signature || !body) {
        return new Response("Bad Request", { status: 400 });
    }

    const basestring = `v0:${timestamp}:${body}`;
    const expectedSignature = crypto
        .createHmac("sha256", AURINKO_SIGNING_SECRET!)
        .update(basestring)
        .digest("hex");

    if (signature !== expectedSignature) {
        return new Response("Unauthorized", { status: 401 });
    }
    type AurinkoNotification = {
        subscription: number;
        resource: string;
        accountId: number;
        payloads: {
            id: string;
            changeType: string;
            attributes: {
                threadId: string;
            };
        }[];
    };

    const payload = JSON.parse(body) as AurinkoNotification;
    console.log("Received notification:", JSON.stringify(payload, null, 2));
    const account = await db.account.findUnique({
        where: {
            id: payload.accountId.toString()
        }
    })
    if (!account) {
        return new Response("Account not found", { status: 404 });
    }
    const acc = new Account(account.token)
    waitUntil(acc.syncEmails().then(() => {
        console.log("Synced emails")
    }))

    // Process the notification payload as needed

    return new Response(null, { status: 200 });
};
