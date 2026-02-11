import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ToolType, ToolStatus } from '@prisma/client';

// Validate tool type
function isValidToolType(type: string): type is ToolType {
  return ['mcp', 'custom_code'].includes(type);
}

// Validate tool status
function isValidToolStatus(status: string): status is ToolStatus {
  return ['active', 'inactive'].includes(status);
}

// GET - List all tools for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tenant_id' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = { tenantId };

    if (type && isValidToolType(type)) {
      where.type = type;
    }

    if (status && isValidToolStatus(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tools = await prisma.tool.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const total = await prisma.tool.count({ where });

    return NextResponse.json({
      tools: tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        type: tool.type,
        config: tool.config,
        status: tool.status,
        createdBy: tool.creator?.email,
        createdAt: tool.createdAt,
        updatedAt: tool.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, description, type, config, status, createdBy } = body;

    // Validate required fields
    if (!tenantId || !name || !type || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, name, type, config' },
        { status: 400 }
      );
    }

    // Validate type
    if (!isValidToolType(type)) {
      return NextResponse.json(
        { error: 'Invalid tool type. Must be "mcp" or "custom_code"' },
        { status: 400 }
      );
    }

    // Validate status
    const toolStatus: ToolStatus = status && isValidToolStatus(status) ? status : 'active';

    // Check if tool with same name already exists for this tenant
    const existingTool = await prisma.tool.findFirst({
      where: {
        tenantId,
        name,
      },
    });

    if (existingTool) {
      return NextResponse.json(
        { error: 'A tool with this name already exists' },
        { status: 409 }
      );
    }

    // Create tool
    const tool = await prisma.tool.create({
      data: {
        tenantId,
        name,
        description: description || null,
        type,
        config,
        status: toolStatus,
        createdBy: createdBy || null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        tool: {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          type: tool.type,
          config: tool.config,
          status: tool.status,
          createdBy: tool.creator?.email,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
