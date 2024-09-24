import { create, insert, search, save, load, type AnyOrama } from "@orama/orama";
import { persist, restore } from "@orama/plugin-data-persistence";
import { db } from "@/server/db";
import { getEmbeddings } from "@/lib/embeddings";

export class OramaManager {
    // @ts-ignore
    private orama: AnyOrama;
    private accountId: string;

    constructor(accountId: string) {
        this.accountId = accountId;
    }

    async initialize() {
        const account = await db.account.findUnique({
            where: { id: this.accountId },
            select: { binaryIndex: true }
        });

        if (!account) throw new Error('Account not found');

        if (account.binaryIndex) {
            this.orama = await restore('dpack', account.binaryIndex as Buffer);
        } else {
            this.orama = await create({
                schema: {
                    title: "string",
                    body: "string",
                    from: 'string',
                    to: 'string[]',
                    sentAt: 'number',
                    embeddings: 'vector[1536]',
                    threadId: 'string'
                },
            });
            await this.saveIndex();
        }
    }

    async insert(document: any) {
        await insert(this.orama, document);
        await this.saveIndex();
    }

    async vectorSearch({ prompt, numResults = 5 }: { prompt: string, numResults?: number }) {
        const embeddings = await getEmbeddings(prompt)
        const results = await search(this.orama, {
            mode: 'vector',
            vector: {
                value: embeddings,
                property: 'embeddings'
            },
            similarity: 0.75,
            limit: numResults
        })
        // console.log(results.hits.map(hit => hit.document))
        return results
    }
    async search({ term }: { term: string }) {
        return await search(this.orama, {
            term: term,
        });
    }

    async saveIndex() {
        const index = await persist(this.orama, 'dpack');
        await db.account.update({
            where: { id: this.accountId },
            data: { binaryIndex: index as Buffer }
        });
    }
}

// Usage example:
async function main() {
    const oramaManager = new OramaManager('67358');
    await oramaManager.initialize();

    // Insert a document
    // const emails = await db.email.findMany({
    //     where: {
    //         thread: { accountId: '67358' }
    //     },
    //     select: {
    //         subject: true,
    //         bodySnippet: true,
    //         from: { select: { address: true, name: true } },
    //         to: { select: { address: true, name: true } },
    //         sentAt: true,
    //     },
    //     take: 100
    // })
    // await Promise.all(emails.map(async email => {
    //     // const bodyEmbedding = await getEmbeddings(email.bodySnippet || '');
    //     // console.log(bodyEmbedding)
    //     await oramaManager.insert({
    //         title: email.subject,
    //         body: email.bodySnippet,
    //         from: `${email.from.name} <${email.from.address}>`,
    //         to: email.to.map(t => `${t.name} <${t.address}>`),
    //         sentAt: email.sentAt.getTime(),
    //         // bodyEmbedding: bodyEmbedding,
    //     })
    // }))


    // Search
    const searchResults = await oramaManager.search({
        term: "cascading",
    });

    console.log(searchResults.hits.map((hit) => hit.document));
}

// main().catch(console.error);
