import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ToolStatus } from '@prisma/client';

// Validate tool status
function isValidToolStatus(status: string): status is ToolStatus {
  return ['active', 'inactive'].includes(status);
}

// GET - Get a single tool by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tool = await prisma.tool.findUnique({
      where: { id },
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

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a tool
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, config, status } = body;

    // Check if tool exists
    const existingTool = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (name && name !== existingTool.name) {
      const duplicateName = await prisma.tool.findFirst({
        where: {
          tenantId: existingTool.tenantId,
          name,
          id: { not: id },
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: 'A tool with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (config !== undefined) updateData.config = config;
    if (status !== undefined && isValidToolStatus(status)) {
      updateData.status = status;
    }

    // Update tool
    const tool = await prisma.tool.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a tool
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if tool exists
    const existingTool = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Delete tool
    await prisma.tool.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Tool deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tool:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Toggle tool status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if tool exists
    const existingTool = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Toggle status
    const newStatus: ToolStatus = existingTool.status === 'active' ? 'inactive' : 'active';

    const tool = await prisma.tool.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      tool: {
        id: tool.id,
        status: tool.status,
      },
    });
  } catch (error) {
    console.error('Error toggling tool status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
