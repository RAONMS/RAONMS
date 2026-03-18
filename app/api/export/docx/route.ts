import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export async function POST(req: Request) {
    try {
        const { text, title } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: title || 'Raon Sales Portal — Business Summary',
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                    }),
                    ...text.split('\n').map((line: string) => {
                        const isTitle = line.trim().match(/^\d+\./); // e.g. "1. Major Issue"
                        return new Paragraph({
                            children: [
                                new TextRun({
                                    text: line,
                                    bold: !!isTitle,
                                    size: isTitle ? 28 : 22,
                                }),
                            ],
                            spacing: { before: 120, after: 120 },
                        });
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="Summary_${new Date().toISOString().slice(0, 10)}.docx"`,
            },
        });

    } catch (error: any) {
        console.error('Docx Export Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
