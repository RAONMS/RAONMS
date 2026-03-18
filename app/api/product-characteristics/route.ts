import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CHARACTERISTICS_FILE = path.join(process.cwd(), 'forecast', 'product_characteristics.json');

function ensureFile() {
    const dir = path.dirname(CHARACTERISTICS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(CHARACTERISTICS_FILE)) {
        fs.writeFileSync(CHARACTERISTICS_FILE, JSON.stringify({}), 'utf8');
    }
}

export async function GET() {
    try {
        ensureFile();
        const content = fs.readFileSync(CHARACTERISTICS_FILE, 'utf8');
        return NextResponse.json(JSON.parse(content));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        ensureFile();
        const data = await req.json(); // { model: { hierarchyType, characteristic, netDie? } }
        
        // Load existing
        const existingContent = fs.readFileSync(CHARACTERISTICS_FILE, 'utf8');
        const existingData = JSON.parse(existingContent);
        
        // Merge
        const newData = { ...existingData, ...data };
        
        fs.writeFileSync(CHARACTERISTICS_FILE, JSON.stringify(newData, null, 2), 'utf8');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
