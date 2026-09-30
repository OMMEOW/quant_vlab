import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const { image, filename } = await req.json();

        if (!image || !filename) {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        // Remove the data:image/png;base64, prefix
        const base64Data = image.replace(/^data:image\/png;base64,/, "");

        // Ensure reports directory exists
        const reportsDir = path.join(process.cwd(), "reports");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const filePath = path.join(reportsDir, filename);
        fs.writeFileSync(filePath, base64Data, 'base64');

        return NextResponse.json({ 
            success: true, 
            message: "Report saved successfully",
            path: filePath
        });
    } catch (error) {
        console.error("Export API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
