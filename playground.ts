import { db } from "@/server/db";

await db.email.deleteMany({
    where: { thread: { accountId: '68392' } }
})