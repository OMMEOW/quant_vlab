import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { image, filename } = await request.json();

    if (!image || !filename) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // Remove base64 prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, filename);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, path: filePath });
  } catch (error: any) {
    console.error('Save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
