import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { text, title } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const safeTitle = escapeHtml(title || 'Raon Sales Portal - Business Summary');
        const body = text
            .split('\n')
            .map((line: string) => {
                const trimmed = line.trim();
                const isTitle = /^\d+\./.test(trimmed);
                const escapedLine = escapeHtml(line || ' ');
                return isTitle
                    ? `<p style="font-weight:700;font-size:16pt;margin:12pt 0 8pt;">${escapedLine}</p>`
                    : `<p style="font-size:11pt;line-height:1.55;margin:8pt 0;">${escapedLine}</p>`;
            })
            .join('');

        const wordHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
</head>
<body style="font-family:Calibri, Arial, sans-serif; margin:36pt;">
<h1 style="text-align:center;font-size:22pt;margin-bottom:20pt;">${safeTitle}</h1>
${body}
</body>
</html>`;

        return new Response(wordHtml, {
            headers: {
                'Content-Type': 'application/msword; charset=utf-8',
                'Content-Disposition': `attachment; filename="Summary_${new Date().toISOString().slice(0, 10)}.doc"`,
            },
        });

    } catch (error: any) {
        console.error('Docx Export Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
