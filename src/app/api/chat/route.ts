import { Configuration, OpenAIApi } from "openai-edge";
import { Message, OpenAIStream, StreamingTextResponse } from "ai";
// import { getContext } from "@/lib/context";
// import { db } from "@/lib/db";
// import { chats, messages as _messages } from "@/lib/db/schema";
// import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { OramaManager } from "@/lib/orama";

// export const runtime = "edge";

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

export async function POST(req: Request) {
    try {
        const { messages, accountId } = await req.json();
        const oramaManager = new OramaManager(accountId)
        oramaManager.initialize()
        const lastMessage = messages[messages.length - 1]
        const context = await oramaManager.vectorSearch({ prompt: lastMessage.content })
        console.log(context.hits.length + ' hits found')

        const prompt = {
            role: "system",
            content: `You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by answering questions, providing suggestions, and offering relevant information based on the context of their previous emails.
      
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
                // save user message into db
                // await db.insert(_messages).values({
                //     chatId,
                //     content: lastMessage.content,
                //     role: "user",
                // });
            },
            onCompletion: async (completion) => {
                // save ai message into db
                // await db.insert(_messages).values({
                //     chatId,
                //     content: completion,
                //     role: "system",
                // });
            },
        });
        return new StreamingTextResponse(stream);
        return




        //     const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
        //     if (_chats.length != 1) {
        //         return NextResponse.json({ error: "chat not found" }, { status: 404 });
        //     }
        //     const fileKey = _chats[0].fileKey;
        //     const lastMessage = messages[messages.length - 1];
        //     const context = await getContext(lastMessage.content, fileKey);

        //     const prompt = {
        //         role: "system",
        //         content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
        //   The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
        //   AI is a well-behaved and well-mannered individual.
        //   AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
        //   AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
        //   AI assistant is a big fan of Pinecone and Vercel.
        //   START CONTEXT BLOCK
        //   ${context}
        //   END OF CONTEXT BLOCK
        //   AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
        //   If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
        //   AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
        //   AI assistant will not invent anything that is not drawn directly from the context.
        //   `,
        //     };

        //     const response = await openai.createChatCompletion({
        //         model: "gpt-3.5-turbo",
        //         messages: [
        //             prompt,
        //             ...messages.filter((message: Message) => message.role === "user"),
        //         ],
        //         stream: true,
        //     });
        //     const stream = OpenAIStream(response, {
        //         onStart: async () => {
        //             // save user message into db
        //             await db.insert(_messages).values({
        //                 chatId,
        //                 content: lastMessage.content,
        //                 role: "user",
        //             });
        //         },
        //         onCompletion: async (completion) => {
        //             // save ai message into db
        //             await db.insert(_messages).values({
        //                 chatId,
        //                 content: completion,
        //                 role: "system",
        //             });
        //         },
        //     });
        //     return new StreamingTextResponse(stream);
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: "error" }, { status: 500 });
    }
}
