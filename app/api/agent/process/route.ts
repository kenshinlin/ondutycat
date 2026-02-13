import { NextRequest, NextResponse } from "next/server";
import { createAgentRunner } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { Alert } from "@prisma/client";

/**
 * API endpoint to trigger agent processing
 * Can be called by scheduled tasks to process recent alerts
 *
 * GET /api/agent/process - Process alerts for all tenants
 * Query params:
 *   - dry_run (optional): If true, don't create issues, just return alerts grouped by tenant
 *
 * Example:
 *   GET /api/agent/process
 *   GET /api/agent/process?dry_run=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dry_run") === "true";

    const startTime = Date.now();

    // Step 1: Get all recent alerts (last 10 seconds) across all tenants
    const alerts = await getRecentAlerts();

    if (alerts.length === 0) {
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        alertsFound: 0,
        tenantsProcessed: 0,
        duration: `${duration}ms`,
      });
    }

    // Step 2: Group alerts by tenant_id
    const alertsByTenant = groupAlertsByTenant(alerts);

    // Step 3: Get all active tenants
    const tenantIds = Object.keys(alertsByTenant);
    const tenants = await prisma.tenant.findMany({
      where: {
        id: { in: tenantIds },
        status: "active",
      },
      select: { id: true },
    });

    const activeTenantIds = new Set(tenants.map((t) => t.id));

    // Step 4: Process each tenant's alerts
    const results: Record<string, any> = {};
    let totalProcessed = 0;
    let totalSkipped = 0;

    for (const [tenantId, tenantAlerts] of Object.entries(alertsByTenant)) {
      if (!activeTenantIds.has(tenantId)) {
        totalSkipped += tenantAlerts.length;
        continue;
      }

      if (dryRun) {
        // Dry run: just return alert summary
        results[tenantId] = {
          alertsFound: tenantAlerts.length,
          alerts: tenantAlerts.map((a: Alert) => ({
            id: a.id,
            title: a.title,
            type: a.alertType,
            severity: a.severity,
            receivedAt: a.receivedAt,
          })),
        };
      } else {
        // Actual processing
        const runner = createAgentRunner();
        const tenantResults = await runner.processTenantAlerts(tenantAlerts);
        results[tenantId] = {
          processed: tenantResults.length,
          results: tenantResults,
        };
        totalProcessed += tenantResults.length;
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      dryRun,
      alertsFound: alerts.length,
      tenantsProcessed: Object.keys(results).length,
      totalSkipped,
      totalProcessed,
      results,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error("Agent processing error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Helper function to get recent alerts (last 10 seconds) across all tenants
 */
async function getRecentAlerts(): Promise<Alert[]> {
  const gap = new Date(Date.now() - 30 * 1000);

  return await prisma.alert.findMany({
    where: {
      status: "open",
      receivedAt: {
        gte: gap,
      },
    },
    orderBy: {
      receivedAt: "desc",
    },
    take: 500, // Higher limit for multiple tenants
  });
}

/**
 * Group alerts by tenant_id
 */
function groupAlertsByTenant(alerts: Alert[]): Record<string, Alert[]> {
  const grouped: Record<string, Alert[]> = {};

  for (const alert of alerts) {
    const tenantId = alert.tenantId;
    if (!grouped[tenantId]) {
      grouped[tenantId] = [];
    }
    grouped[tenantId]!.push(alert);
  }

  return grouped;
}
