import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendAlertToIM, IMMessage } from '@/lib/im-sender';
import { AlertSeverity } from '@prisma/client';

// Validate severity value
function isValidSeverity(severity: string): severity is AlertSeverity {
  return ['critical', 'high', 'medium', 'low'].includes(severity);
}

// Map string to AlertSeverity enum with default
function mapSeverity(severity?: string): AlertSeverity {
  if (severity && isValidSeverity(severity)) {
    return severity;
  }
  return 'medium';
}

export async function POST(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const receiverIm = searchParams.get('receiver_im');
    const tenantId = searchParams.get('tenant_id');

    // Validate required parameters
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tenant_id' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.title && !body.message) {
      return NextResponse.json(
        { error: 'Missing required field: title or message' },
        { status: 400 }
      );
    }

    // Prepare alert data
    const alertData = {
      tenantId,
      source: body.source || 'unknown',
      alertType: body.alert_type || body.alertType || 'general',
      severity: mapSeverity(body.severity),
      title: body.title || body.message,
      description: body.description || body.message,
      rawPayload: body,
    };

    // Find IM receiver if receiver_im is provided
    let imReceiver = null;
    if (receiverIm) {
      imReceiver = await prisma.iMReceiver.findFirst({
        where: {
          receiverIm,
          tenantId,
          status: 'active',
        },
      });
    }

    // Create alert in database
    const alert = await prisma.alert.create({
      data: {
        ...alertData,
        receiverId: imReceiver?.id,
      },
    });

    // Forward to IM if receiver is configured
    let imResult = null;
    if (imReceiver) {
      const imMessage: IMMessage = {
        title: alert.title,
        description: alert.description || undefined,
        severity: alert.severity,
        source: alert.source,
        alertId: alert.id,
      };

      imResult = await sendAlertToIM({
        imType: imReceiver.imType,
        webhookUrl: imReceiver.webhookUrl,
        botToken: imReceiver.botToken,
        destinationId: imReceiver.destinationId,
        message: imMessage,
      });
    }

    return NextResponse.json(
      {
        success: true,
        alert: {
          id: alert.id,
          title: alert.title,
          severity: alert.severity,
          status: alert.status,
          receivedAt: alert.receivedAt,
        },
        imForwarded: imResult ? imResult.success : false,
        imError: imResult && !imResult.success ? imResult.error : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing alert webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list alerts (for testing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tenant_id' },
        { status: 400 }
      );
    }

    const alerts = await prisma.alert.findMany({
      where: { tenantId },
      take: limit,
      skip: offset,
      orderBy: { receivedAt: 'desc' },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            imType: true,
            receiverIm: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const total = await prisma.alert.count({
      where: { tenantId },
    });

    return NextResponse.json({
      alerts,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
