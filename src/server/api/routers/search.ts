import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { authoriseAccountAccess } from "./mail";
import { OramaManager } from "@/lib/orama";
import { getEmbeddings } from "@/lib/embeddings";

export const searchRouter = createTRPCRouter({
    search: protectedProcedure.input(z.object({
        accountId: z.string(),
        query: z.string(),
    })).mutation(async ({ input, ctx }) => {
        const account = await ctx.db.account.findFirst({
            where: {
                id: input.accountId,
                userId: ctx.auth.userId,
            },
            select: {
                id: true
            }
        })

        if (!account) throw new Error("Invalid token")
        const oramaManager = new OramaManager(account.id);
        await oramaManager.initialize();


        const { query } = input;
        const results = await oramaManager.search({ term: query });
        return results
    }),
});
