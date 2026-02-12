import { NextRequest, NextResponse } from 'next/server';
import { agentOrchestrator } from '@/lib/agent/agent-orchestrator';
import { prisma } from '@/lib/prisma';

/**
 * API endpoint to trigger agent processing
 * Can be called by scheduled tasks to process recent alerts
 *
 * GET /api/agent/process - Process alerts for a specific tenant
 * Query params:
 *   - tenant_id (required): Tenant ID to process alerts for
 *   - dry_run (optional): If true, don't create issues, just simulate
 *
 * Example:
 *   GET /api/agent/process?tenant_id=xxx-xxx-xxx
 *   GET /api/agent/process?tenant_id=xxx&dry_run=true
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const dryRun = searchParams.get('dry_run') === 'true';

    // Validate tenant_id parameter
    if (!tenantId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: tenant_id',
          usage: 'GET /api/agent/process?tenant_id=<tenant_id>&dry_run=<true|false>',
        },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found', tenantId },
        { status: 404 }
      );
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Tenant is not active',
          tenantId,
          tenantStatus: tenant.status,
        },
        { status: 403 }
      );
    }

    // Process alerts for this tenant
    const startTime = Date.now();

    // If dry run, just read and return alerts without processing
    if (dryRun) {
      const alerts = await getRecentAlerts(tenantId);
      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        dryRun: true,
        tenantId,
        alertsFound: alerts.length,
        alerts: alerts.map(a => ({
          id: a.id,
          title: a.title,
          type: a.alertType,
          severity: a.severity,
          receivedAt: a.receivedAt,
        })),
        duration: `${duration}ms`,
      });
    }

    // Actual processing
    const results = await agentOrchestrator.processTenantAlerts(tenantId);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      tenantId,
      processed: results.length,
      results,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('Agent processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to process alerts for multiple tenants
 * Body: { tenant_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_ids } = body;

    if (!tenant_ids || !Array.isArray(tenant_ids)) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          usage: 'POST { "tenant_ids": ["id1", "id2", ...] }',
        },
        { status: 400 }
      );
    }

    // Process all tenants in parallel
    const results = await Promise.allSettled(
      tenant_ids.map(async (tenantId: string) => {
        try {
          const result = await agentOrchestrator.processTenantAlerts(tenantId);
          return { tenantId, success: true, result };
        } catch (error) {
          return {
            tenantId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Aggregate results
    const summary = {
      total: tenant_ids.length,
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map(r =>
        r.status === 'fulfilled' ? r.value : r.reason
      ),
    };

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('Batch agent processing error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get recent alerts (last 10 seconds)
 */
async function getRecentAlerts(tenantId: string) {
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

  return await prisma.alert.findMany({
    where: {
      tenantId,
      status: 'open',
      receivedAt: {
        gte: tenSecondsAgo,
      },
    },
    orderBy: {
      receivedAt: 'desc',
    },
    take: 50,
  });
}
