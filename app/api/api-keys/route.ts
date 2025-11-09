import { NextRequest, NextResponse } from "next/server";
import * as storage from "@/lib/api-keys-storage";

// GET - List all API keys
export async function GET() {
  const apiKeys = await storage.getAllApiKeys();
  return NextResponse.json(apiKeys);
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const newApiKey = await storage.createApiKey(name.trim());
    return NextResponse.json(newApiKey, { status: 201 });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
