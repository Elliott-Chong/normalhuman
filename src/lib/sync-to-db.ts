import { db } from '@/server/db';
import type { SyncUpdatedResponse, EmailMessage, EmailAddress, EmailAttachment, EmailHeader } from './types';
import pLimit from 'p-limit';
import { Prisma } from '@prisma/client';
import { OramaManager } from './orama';
import { getEmbeddings } from './embeddings';
import { turndown } from './turndown';

async function syncEmailsToDatabase(emails: EmailMessage[], accountId: string) {
    console.log(`Syncing ${emails.length} emails to database`);
    const limit = pLimit(10); // Process up to 10 emails concurrently

    const oramaClient = new OramaManager(accountId)
    oramaClient.initialize()

    await Promise.all(
        [Promise.all(emails.map(email => {
            return limit(async () => {
                const body = turndown.turndown(email.body ?? email.bodySnippet ?? '')
                const payload = `From: ${email.from.name} <${email.from.address}>\nTo: ${email.to.map(t => `${t.name} <${t.address}>`).join(', ')}\nSubject: ${email.subject}\nBody: ${body}\n SentAt: ${new Date(email.sentAt).toLocaleString()}`
                const bodyEmbedding = await getEmbeddings(payload);
                await oramaClient.insert({
                    title: email.subject,
                    body: body,
                    rawBody: email.bodySnippet ?? email.body ?? '',
                    from: `${email.from.name} <${email.from.address}>`,
                    to: email.to.map(t => `${t.name} <${t.address}>`),
                    sentAt: new Date(email.sentAt).toLocaleString(),
                    embeddings: bodyEmbedding,
                    threadId: email.threadId
                })
            })
        })),
        Promise.all(emails.map((email, index) => limit(() => upsertEmail(email, index, accountId))))]
    )

    await oramaClient.saveIndex()
}

async function upsertEmail(email: EmailMessage, index: number, accountId: string) {
    console.log(`Upserting email ${index + 1}`);
    try {

        // determine email label type
        let emailLabelType: 'inbox' | 'sent' | 'draft' = 'inbox'
        if (email.sysLabels.includes('inbox') || email.sysLabels.includes('important')) {
            emailLabelType = 'inbox'
        } else if (email.sysLabels.includes('sent')) {
            emailLabelType = 'sent'
        } else if (email.sysLabels.includes('draft')) {
            emailLabelType = 'draft'
        }

        // 1. Upsert EmailAddress records
        const addressesToUpsert = new Set([
            email.from,
            ...email.to,
            ...email.cc,
            ...email.bcc,
            ...email.replyTo
        ]);

        const upsertedAddresses = await Promise.all(
            Array.from(addressesToUpsert).map(address => upsertEmailAddress(address, accountId))
        );

        const addressMap = new Map(
            upsertedAddresses.filter(Boolean).map(address => [address!.address, address])
        );

        const fromAddress = addressMap.get(email.from.address);
        if (!fromAddress) {
            console.error(`Failed to upsert from address for email ${email.id}`);
            return;
        }

        const toAddresses = email.to.map(addr => addressMap.get(addr.address)).filter(Boolean);
        const ccAddresses = email.cc.map(addr => addressMap.get(addr.address)).filter(Boolean);
        const bccAddresses = email.bcc.map(addr => addressMap.get(addr.address)).filter(Boolean);
        const replyToAddresses = email.replyTo.map(addr => addressMap.get(addr.address)).filter(Boolean);

        // 2. Upsert Thread
        const thread = await db.thread.upsert({
            where: { id: email.threadId },
            update: {
                subject: email.subject,
                accountId,
                lastMessageDate: new Date(email.sentAt),
                done: false,
                participantIds: [...new Set([
                    fromAddress.id,
                    ...toAddresses.map(a => a!.id),
                    ...ccAddresses.map(a => a!.id),
                    ...bccAddresses.map(a => a!.id)
                ])]
            },
            create: {
                id: email.threadId,
                accountId,
                subject: email.subject,
                done: false,
                draftStatus: emailLabelType === 'draft',
                inboxStatus: emailLabelType === 'inbox',
                sentStatus: emailLabelType === 'sent',
                lastMessageDate: new Date(email.sentAt),
                participantIds: [...new Set([
                    fromAddress.id,
                    ...toAddresses.map(a => a!.id),
                    ...ccAddresses.map(a => a!.id),
                    ...bccAddresses.map(a => a!.id)
                ])]
            }
        });

        // 3. Upsert Email
        await db.email.upsert({
            where: { id: email.id },
            update: {
                threadId: thread.id,
                createdTime: new Date(email.createdTime),
                lastModifiedTime: new Date(),
                sentAt: new Date(email.sentAt),
                receivedAt: new Date(email.receivedAt),
                internetMessageId: email.internetMessageId,
                subject: email.subject,
                sysLabels: email.sysLabels,
                keywords: email.keywords,
                sysClassifications: email.sysClassifications,
                sensitivity: email.sensitivity,
                meetingMessageMethod: email.meetingMessageMethod,
                fromId: fromAddress.id,
                to: { set: toAddresses.map(a => ({ id: a!.id })) },
                cc: { set: ccAddresses.map(a => ({ id: a!.id })) },
                bcc: { set: bccAddresses.map(a => ({ id: a!.id })) },
                replyTo: { set: replyToAddresses.map(a => ({ id: a!.id })) },
                hasAttachments: email.hasAttachments,
                internetHeaders: email.internetHeaders as any,
                body: email.body,
                bodySnippet: email.bodySnippet,
                inReplyTo: email.inReplyTo,
                references: email.references,
                threadIndex: email.threadIndex,
                nativeProperties: email.nativeProperties as any,
                folderId: email.folderId,
                omitted: email.omitted,
                emailLabel: emailLabelType,
            },
            create: {
                id: email.id,
                emailLabel: emailLabelType,
                threadId: thread.id,
                createdTime: new Date(email.createdTime),
                lastModifiedTime: new Date(),
                sentAt: new Date(email.sentAt),
                receivedAt: new Date(email.receivedAt),
                internetMessageId: email.internetMessageId,
                subject: email.subject,
                sysLabels: email.sysLabels,
                internetHeaders: email.internetHeaders as any,
                keywords: email.keywords,
                sysClassifications: email.sysClassifications,
                sensitivity: email.sensitivity,
                meetingMessageMethod: email.meetingMessageMethod,
                fromId: fromAddress.id,
                to: { connect: toAddresses.map(a => ({ id: a!.id })) },
                cc: { connect: ccAddresses.map(a => ({ id: a!.id })) },
                bcc: { connect: bccAddresses.map(a => ({ id: a!.id })) },
                replyTo: { connect: replyToAddresses.map(a => ({ id: a!.id })) },
                hasAttachments: email.hasAttachments,
                body: email.body,
                bodySnippet: email.bodySnippet,
                inReplyTo: email.inReplyTo,
                references: email.references,
                threadIndex: email.threadIndex,
                nativeProperties: email.nativeProperties as any,
                folderId: email.folderId,
                omitted: email.omitted,
            }
        });


        const threadEmails = await db.email.findMany({
            where: { threadId: thread.id },
            orderBy: { receivedAt: 'asc' }
        });

        let threadFolderType = 'sent';
        for (const threadEmail of threadEmails) {
            if (threadEmail.emailLabel === 'inbox') {
                threadFolderType = 'inbox';
                break; // If any email is in inbox, the whole thread is in inbox
            } else if (threadEmail.emailLabel === 'draft') {
                threadFolderType = 'draft'; // Set to draft, but continue checking for inbox
            }
        }
        await db.thread.update({
            where: { id: thread.id },
            data: {
                draftStatus: threadFolderType === 'draft',
                inboxStatus: threadFolderType === 'inbox',
                sentStatus: threadFolderType === 'sent',
            }
        });

        // 4. Upsert Attachments
        for (const attachment of email.attachments) {
            await upsertAttachment(email.id, attachment);
        }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error(`Prisma error for email ${email.id}: ${error.message}`);
        } else {
            console.error(`Unknown error for email ${email.id}: ${error}`);
        }
    }
}

async function upsertEmailAddress(address: EmailAddress, accountId: string) {
    try {
        return await db.emailAddress.upsert({
            where: { accountId_address: { accountId: accountId, address: address.address ?? "" } },
            update: { name: address.name, raw: address.raw },
            create: { address: address.address ?? "", name: address.name, raw: address.raw, accountId },
        });
    } catch (error) {
        console.error(`Failed to upsert email address: ${error}`);
        return null;
    }
}

async function upsertAttachment(emailId: string, attachment: EmailAttachment) {
    try {
        await db.emailAttachment.upsert({
            where: { id: attachment.id ?? "" },
            update: {
                name: attachment.name,
                mimeType: attachment.mimeType,
                size: attachment.size,
                inline: attachment.inline,
                contentId: attachment.contentId,
                content: attachment.content,
                contentLocation: attachment.contentLocation,
            },
            create: {
                id: attachment.id,
                emailId,
                name: attachment.name,
                mimeType: attachment.mimeType,
                size: attachment.size,
                inline: attachment.inline,
                contentId: attachment.contentId,
                content: attachment.content,
                contentLocation: attachment.contentLocation,
            },
        });
    } catch (error) {
        console.error(`Failed to upsert attachment for email ${emailId}: ${error}`);
    }
}

export { syncEmailsToDatabase };