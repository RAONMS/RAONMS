import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { supabase } from '@/lib/supabase';
import mammoth from 'mammoth';

export async function POST(req: Request) {
    try {
        const pdf = require('pdf-parse-fork');
        const bedrock = new BedrockRuntimeClient({
            region: process.env.APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY || '',
            },
        });
        const { text, files } = await req.json();

        let consolidatedText = text || '';

        // Process attachments if any
        if (files && Array.isArray(files)) {
            for (const file of files) {
                const buffer = Buffer.from(file.base64, 'base64');
                
                if (file.type === 'application/pdf') {
                    const pdfData = await pdf(buffer);
                    consolidatedText += `\n\n--- Content from ${file.name} (PDF) ---\n${pdfData.text}`;
                } 
                else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    const docxData = await mammoth.extractRawText({ buffer });
                    consolidatedText += `\n\n--- Content from ${file.name} (Word) ---\n${docxData.value}`;
                }
                else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
                    consolidatedText += `\n\n--- Content from ${file.name} ---\n${buffer.toString('utf-8')}`;
                }
            }
        }

        if (!consolidatedText.trim()) {
            return NextResponse.json({ error: 'No content provided to summarize' }, { status: 400 });
        }

        // Fetch System Prompt
        const { data: settings } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'business_summary_prompt')
            .single();

        const systemPrompt = settings?.value || `당신은 비즈니스 요약 전문가입니다. 핵심 내용을 한국어로 요약하세요.`;

        const modelId = "us.meta.llama3-1-8b-instruct-v1:0";

        const command = new ConverseCommand({
            modelId: modelId,
            messages: [
                {
                    role: 'user',
                    content: [{ text: `다음 내용을 분석하여 요약본을 작성하세요:\n\n${consolidatedText}` }]
                }
            ],
            system: [{ text: systemPrompt }],
            inferenceConfig: {
                maxTokens: 4096,
                temperature: 0.2,
                topP: 0.9,
            },
        });

        const response = await bedrock.send(command);
        
        if (!response.output?.message?.content?.[0]?.text) {
            throw new Error("AI failed to return content");
        }

        const summary = response.output.message.content[0].text;
        return NextResponse.json({ summary });

    } catch (error: any) {
        console.error('Summarize Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
