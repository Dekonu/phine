import { NextRequest, NextResponse } from "next/server";
import * as storage from "@/lib/api-keys-storage";

// GET - Get a single API key by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiKey = await storage.getApiKeyById(id);

  if (!apiKey) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  // Return masked key for security
  return NextResponse.json({
    ...apiKey,
    key: apiKey.key.substring(0, 8) + "•".repeat(apiKey.key.length - 12) + apiKey.key.substring(apiKey.key.length - 4),
  });
}

// PUT - Update an API key (only name can be updated)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const updatedKey = await storage.updateApiKey(id, name.trim());

    if (!updatedKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Return masked key
    return NextResponse.json({
      ...updatedKey,
      key: updatedKey.key.substring(0, 8) + "•".repeat(updatedKey.key.length - 12) + updatedKey.key.substring(updatedKey.key.length - 4),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await storage.deleteApiKey(id);

    if (!deleted) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "API key deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
