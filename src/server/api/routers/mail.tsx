import { nylas } from "@/lib/nylas";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { cookies } from "next/headers";

export const mailRouter = createTRPCRouter({

    authorize: publicProcedure.mutation(async ({ ctx }) => {
        const authUrl = nylas.auth.urlForOAuth2({
            clientId: process.env.NYLAS_CLIENT_ID as string,
            redirectUri: `${process.env.NEXT_PUBLIC_URL}/api/auth/callback/nylas`,
        });

        return { authUrl };
    }),


    getMyEmails: protectedProcedure.input(z.object({
        grantToken: z.string(),
    })).query(async ({ ctx, input }) => {
        const grant = await ctx.db.grant.findUnique({
            where: {
                token: input.grantToken,
            },
        });

        if (!grant) {
            throw new Error("Grant not found");
        }

        const emails = await nylas.messages.list({
            identifier: grant.id,
            queryParams: {
                limit: 100,
            }
        });

        return emails;
    }),
});