import { NextRequest, NextResponse } from "next/server";
import * as storage from "@/lib/api-keys-storage";

// GET - Get the full (unmasked) API key by ID
// This endpoint should be protected in production with proper authentication
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiKey = await storage.getApiKeyById(id);

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Return full key (unmasked)
    return NextResponse.json({
      id: apiKey.id,
      key: apiKey.key,
    });
  } catch (error) {
    console.error("Error revealing API key:", error);
    return NextResponse.json(
      { error: "Failed to reveal API key" },
      { status: 500 }
    );
  }
}

