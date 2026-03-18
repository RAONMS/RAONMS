import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({
    region: process.env.APP_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || '',
    },
});

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Using Llama 3.1 8b Inference Profile to support on-demand throughput
        const modelId = "us.meta.llama3-1-8b-instruct-v1:0";

        const systemPrompt = `You are a helpful assistant that summarizes meeting transcripts into structured JSON. 
Extract the following fields: 
- date (YYYY-MM-DD)
- attendees (string)
- agenda (string)
- notes (string)
- follow_up (string)

CRITICAL: Ensure ALL fields are plain strings. If a field has multiple items, join them with commas into a single string. Do NOT return nested objects or arrays. 
Output MUST be a valid JSON object only. No preamble.`;

        const command = new ConverseCommand({
            modelId: modelId,
            messages: [
                {
                    role: 'user',
                    content: [{ text: `Summarize this meeting transcript:\n\n${text}` }]
                }
            ],
            system: [{ text: systemPrompt }],
            inferenceConfig: {
                maxTokens: 2048,
                temperature: 0.1,
                topP: 0.9,
            },
        });

        const response = await bedrock.send(command);
        
        if (!response.output?.message?.content?.[0]?.text) {
            throw new Error("AI failed to return content");
        }

        const resultText = response.output.message.content[0].text;
        
        try {
            const jsonStart = resultText.indexOf('{');
            const jsonEnd = resultText.lastIndexOf('}') + 1;
            const jsonPart = resultText.substring(jsonStart, jsonEnd);
            const data = JSON.parse(jsonPart);
            return NextResponse.json(data);
        } catch (e) {
            console.error("Failed to parse AI JSON:", resultText);
            return NextResponse.json({ error: 'AI failed to return valid JSON', raw: resultText }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Bedrock Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
