import { connectToDatabase } from "@/lib/db/mongodb";
import { ActivityLog } from "@/models/ActivityLog";

/**
 * Records one line in HQ's activity feed. Called from every HQ route that
 * changes something, right after the write succeeds — never blocks or fails
 * the request it's logging (a missed log line is better than a failed
 * payment/delete).
 */
export async function logActivity(input: { hqEmail: string; action: string; summary: string; restaurantId?: string; restaurantName?: string; metadata?: Record<string, unknown> }): Promise<void> {
  try {
    await connectToDatabase();
    await ActivityLog.create(input);
  } catch (error) {
    console.error("[hq] activity log failed", error);
  }
}
