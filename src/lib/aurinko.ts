'use server'
import axios from 'axios'
import type { EmailMessage } from './types';

export const getAurinkoAuthorizationUrl = async (serviceType: 'Google' | 'Office365') => {
    const params = new URLSearchParams({
        clientId: process.env.AURINKO_CLIENT_ID as string,
        serviceType,
        scopes: 'Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All',
        responseType: 'code',
        returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/aurinko/callback`,
    });

    return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
};


export const getAurinkoToken = async (code: string) => {
    try {
        const response = await axios.post(`https://api.aurinko.io/v1/auth/token/${code}`,
            {},
            {
                auth: {
                    username: process.env.AURINKO_CLIENT_ID as string,
                    password: process.env.AURINKO_CLIENT_SECRET as string,
                }
            }
        );

        return response.data as {
            accountId: number,
            accessToken: string,
            userId: string,
            userSession: string
        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching Aurinko token:', error.response?.data);
        } else {
            console.error('Unexpected error fetching Aurinko token:', error);
        }
    }
}

export const getAccountDetails = async (accessToken: string) => {
    try {
        const response = await axios.get('https://api.aurinko.io/v1/account', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data as {
            email: string,
            name: string
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching account details:', error.response?.data);
        } else {
            console.error('Unexpected error fetching account details:', error);
        }
        throw error;
    }
}

export const getEmailDetails = async (accessToken: string, emailId: string) => {
    try {
        const response = await axios.get<EmailMessage>(`https://api.aurinko.io/v1/email/messages/${emailId}`, {
            params: {
                loadInlines: true
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching email details:', error.response?.data);
        } else {
            console.error('Unexpected error fetching email details:', error);
        }
        throw error;
    }
}