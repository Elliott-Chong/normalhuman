'use server';

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createStreamableValue } from 'ai/rsc';

export async function generate(input: string) {
    const stream = createStreamableValue('');

    console.log("input", input);
    (async () => {
        const { textStream } = await streamText({
            model: openai('gpt-4o-mini'),
            prompt: `
            You are a helpful AI embedded in a email client app that is used to answer questions about the emails in the inbox.
            ${input}
            `,
        });

        for await (const delta of textStream) {
            stream.update(delta);
        }

        stream.done();
    })();

    return { output: stream.value };
}