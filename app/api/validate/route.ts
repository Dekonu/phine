import { NextRequest, NextResponse } from "next/server";
import * as storage from "@/lib/api-keys-storage";

/**
 * Validates an API key against the Supabase database.
 * This endpoint queries the api_keys table in Supabase to verify
 * if the provided API key exists and is valid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "API key is required", valid: false },
        { status: 400 }
      );
    }

    // Validate against Supabase database (not local storage)
    // getApiKeyByKey queries the api_keys table directly from Supabase
    const key = await storage.getApiKeyByKey(apiKey.trim());

    if (!key) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error("Error validating API key:", error);
    return NextResponse.json(
      { error: "Failed to validate API key", valid: false },
      { status: 500 }
    );
  }
}

