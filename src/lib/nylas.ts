import Nylas from "nylas";

const config = {
    clientId: process.env.NYLAS_CLIENT_ID!,
    callbackUri: "http://localhost:3000/oauth/exchange",
    apiKey: process.env.NYLAS_API_KEY!,
    apiUri: "https://api.us.nylas.com",
};

export const nylas = new Nylas({
    apiKey: config.apiKey,
    apiUri: config.apiUri, // "https://api.us.nylas.com" or "https://api.eu.nylas.com"
});