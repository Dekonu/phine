import { NextRequest, NextResponse } from "next/server";
import * as storage from "@/lib/api-keys-storage";

/**
 * GitHub Summarizer API endpoint
 * Requires API key authentication via X-API-Key header
 * Takes a gitHubUrl in the request body
 */
export async function POST(request: NextRequest) {
  try {
    // Extract API key from header (preferred) or Authorization header
    const apiKey = 
      request.headers.get("X-API-Key") || 
      request.headers.get("Authorization")?.replace("Bearer ", "") ||
      request.headers.get("Authorization")?.replace("ApiKey ", "");

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "API key is required. Please provide it in the X-API-Key header or Authorization header." },
        { status: 401 }
      );
    }

    // Validate API key against database
    const key = await storage.getApiKeyByKey(apiKey.trim());

    if (!key) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    // Check if API key has remaining uses
    const hasRemainingUses = await storage.checkAndConsumeUsage(key.id);

    if (!hasRemainingUses) {
      return NextResponse.json(
        { 
          error: "API key usage limit exceeded",
          remainingUses: key.remainingUses || 0,
          usageCount: key.usageCount
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { gitHubUrl } = body;

    if (!gitHubUrl || typeof gitHubUrl !== "string" || gitHubUrl.trim().length === 0) {
      // Refund the usage since request is invalid
      // Note: In a production system, you might want to handle this differently
      return NextResponse.json(
        { error: "gitHubUrl is required in the request body" },
        { status: 400 }
      );
    }

    // Record API usage for analytics (usage already consumed by checkAndConsumeUsage)
    await storage.recordApiUsage(key.id, undefined, true);

    // Placeholder response - doesn't do anything with the URL yet
    return NextResponse.json(
      {
        message: "Request received successfully",
        gitHubUrl: gitHubUrl.trim(),
        status: "pending",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in github-summarizer endpoint:", error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

