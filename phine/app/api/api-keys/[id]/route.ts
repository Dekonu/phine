import { NextRequest, NextResponse } from "next/server";
import * as storage from "@/lib/api-keys-storage";

// GET - List all API keys
export async function GET() {
  const apiKeys = storage.getAllApiKeys();
  return NextResponse.json(apiKeys);
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, key } = body;

    if (!name || !key) {
      return NextResponse.json(
        { error: "Name and key are required" },
        { status: 400 }
      );
    }

    const newApiKey = storage.createApiKey(name, key);
    return NextResponse.json(newApiKey, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
