import axios from 'axios';
import { writeFileSync } from 'fs';

const API_BASE_URL = 'https://api.aurinko.io/v1';
const ACCESS_TOKEN = '0YC7WbDiYeszCs_5n3uv8iIZGiGbtiznH7X03akZmHI';

interface SyncResponse {
    syncUpdatedToken: string;
    syncDeletedToken: string;
    ready: boolean;
}

interface EmailMessage {
    id: string;
    subject: string;
    // Add other email properties as needed
}

interface SyncUpdatedResponse {
    pageToken?: string;
    nextDeltaToken: string;
    records: EmailMessage[];
}

async function startSync(daysWithin: number): Promise<SyncResponse> {
    const response = await axios.post<SyncResponse>(
        `${API_BASE_URL}/email/sync`,
        { daysWithin },
        { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
    );
    return response.data;
}

async function getUpdatedEmails({ deltaToken, pageToken }: { deltaToken?: string, pageToken?: string }): Promise<SyncUpdatedResponse> {
    console.log('getUpdatedEmails', { deltaToken, pageToken });
    let params: Record<string, string> = {};
    if (deltaToken) {
        params.deltaToken = deltaToken;
    }
    if (pageToken) {
        params.pageToken = pageToken;
    }
    const response = await axios.get<SyncUpdatedResponse>(
        `${API_BASE_URL}/email/sync/updated`,
        {
            params,
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
        }
    );
    return response.data;
}

async function performInitialSync() {
    try {
        // Start the sync process
        let syncResponse = await startSync(7); // Sync emails from the last 7 days

        // Wait until the sync is ready
        while (!syncResponse.ready) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            syncResponse = await startSync(7);
        }

        console.log('Sync is ready. Tokens:', syncResponse);

        // Perform initial sync of updated emails
        let updatedResponse = await getUpdatedEmails({ deltaToken: syncResponse.syncUpdatedToken });
        let allEmails: EmailMessage[] = updatedResponse.records;

        // Fetch all pages if there are more
        while (updatedResponse.pageToken) {
            updatedResponse = await getUpdatedEmails({ pageToken: updatedResponse.pageToken });
            allEmails = allEmails.concat(updatedResponse.records);
        }

        console.log('Initial sync complete. Total emails:', allEmails.length);

        // Store the nextDeltaToken for future incremental syncs
        const storedDeltaToken = updatedResponse.nextDeltaToken;
        writeFileSync('emails.json', JSON.stringify(allEmails, null, 2));

        // Example of using the stored delta token for an incremental sync
        // await performIncrementalSync(storedDeltaToken);

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error during sync:', error.response?.data);
        } else {
            console.error('Error during sync:', error);
        }
    }
}

async function performIncrementalSync(deltaToken: string) {
    try {
        const updatedResponse = await getUpdatedEmails({ deltaToken });
        console.log('New or updated emails:', updatedResponse.records.length);

        // Process the new or updated emails here

        // Store the new delta token for the next sync
        const newDeltaToken = updatedResponse.nextDeltaToken;
        console.log('New delta token for next sync:', newDeltaToken);

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error during incremental sync:', error.response?.data);
        } else {
            console.error('Error during incremental sync:', error);
        }
    }
}

// Run the initial sync
performInitialSync();