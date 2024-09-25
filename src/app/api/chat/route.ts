import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
// import { getContext } from "@/lib/context";
// import { db } from "@/lib/db";
// import { chats, messages as _messages } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { OramaManager } from "@/lib/orama";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionStatus } from "@/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";

// export const runtime = "edge";

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const isSubscribed = await getSubscriptionStatus()
        if (!isSubscribed) {
            const chatbotInteraction = await db.chatbotInteraction.findUnique({
                where: {
                    day: new Date().toDateString(),
                    userId
                }
            })
            if (!chatbotInteraction) {
                await db.chatbotInteraction.create({
                    data: {
                        day: new Date().toDateString(),
                        count: 1,
                        userId
                    }
                })
            } else if (chatbotInteraction.count >= FREE_CREDITS_PER_DAY) {
                return NextResponse.json({ error: "Limit reached" }, { status: 429 });
            }
        }
        const { messages, accountId } = await req.json();
        const oramaManager = new OramaManager(accountId)
        oramaManager.initialize()

        const lastMessage = messages[messages.length - 1]

        const initialPrompt = `You are a RAG agent made to create prompt to retrieve information from the user's email.
        The user will ask a question and you will need to create a prompt to retrieve the information they need.
        The user will also provide you with the message context.
        You will need to use the message context to create the prompt.
        Your output will be used as part of a RAG search, so make sure to include the necessary information to retrieve the relevant information even if you don't know the answer.`

        const initialResponse = await (await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: initialPrompt
                },
                ...messages
            ],
        })).json();


        const initialPromptResponse = initialResponse.choices[0].message.content
        console.log(initialPromptResponse)


        const context = await oramaManager.vectorSearch({ prompt: lastMessage.content + initialPromptResponse })
        console.log(context.hits.length + ' hits found')

        const prompt = {
            role: "system",
            content: `You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by answering questions, providing suggestions, and offering relevant information based on the context of their previous emails.
            THE TIME NOW IS ${new Date().toLocaleString()}
      
      START CONTEXT BLOCK
      ${context.hits.map((hit) => JSON.stringify(hit.document)).join('\n')}
      END OF CONTEXT BLOCK
      
      When responding, please keep in mind:
      - Be helpful, clever, and articulate.
      - Rely on the provided email context to inform your responses.
      - If the context does not contain enough information to answer a question, politely say you don't have enough information.
      - Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
      - Do not invent or speculate about anything that is not directly supported by the email context.
      - Keep your responses concise and relevant to the user's questions or the email being composed.`
        };


        const response = await openai.createChatCompletion({
            model: "gpt-4o-mini",
            messages: [
                prompt,
                ...messages.filter((message: Message) => message.role === "user"),
            ],
            stream: true,
        });
        const stream = OpenAIStream(response, {
            onStart: async () => {
            },
            onCompletion: async (completion) => {
                const today = new Date().toDateString()
                await db.chatbotInteraction.update({
                    where: {
                        userId,
                        day: today
                    },
                    data: {
                        count: {
                            increment: 1
                        }
                    }
                })
            },
        });
        return new StreamingTextResponse(stream);
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: "error" }, { status: 500 });
    }
}
