import { NextResponse } from "next/server";
import * as storage from "@/lib/api-keys-storage";

// GET - Get API metrics
export async function GET() {
  const metrics = await storage.getApiMetrics();
  return NextResponse.json(metrics);
}
