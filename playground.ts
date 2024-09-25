// import { db } from "@/server/db";

import { getEmbeddings } from "@/lib/embeddings";
import { OramaManager } from "@/lib/orama";
import { turndown } from "@/lib/turndown";
import { db } from "@/server/db";

// await db.email.deleteMany({
//     where: { thread: { accountId: '68392' } }
// })

const orama = new OramaManager('68406')
await orama.initialize()

const emails = await db.email.findMany({
    where: {
        thread: {
            accountId: '68406'
        },
    }
    , select: {
        id: true,
        threadId: true,
        subject: true,
        bodySnippet: true,
        from: true,
        to: true,
        sentAt: true,
        body: true
    }
})
await Promise.all(emails.map(async email => {
    const body = turndown.turndown(email.body ?? email.bodySnippet ?? '')
    console.log(body)
    const payload = `From: ${email.from.name} <${email.from.address}>\nTo: ${email.to.map(t => `${t.name} <${t.address}>`).join(', ')}\nSubject: ${email.subject}\nBody: ${body}\n SentAt: ${new Date(email.sentAt).toLocaleString()}`
    const bodyEmbedding = await getEmbeddings(payload);
    await orama.insert({
        title: email.subject,
        body: body,
        from: `${email.from.name} <${email.from.address}>`,
        to: email.to.map(t => `${t.name} <${t.address}>`),
        sentAt: new Date(email.sentAt).toLocaleString(),
        embeddings: bodyEmbedding,
        threadId: email.threadId
    })
}))

await orama.saveIndex()