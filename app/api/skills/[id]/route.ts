import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SkillStatus } from '@prisma/client';

// Validate skill status
function isValidSkillStatus(status: string): status is SkillStatus {
  return ['active', 'inactive'].includes(status);
}

// GET - Get a single skill by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const skill = await prisma.skill.findUnique({
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

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      skill: {
        id: skill.id,
        name: skill.name,
        problemDescription: skill.problemDescription,
        sop: skill.sop,
        status: skill.status,
        createdBy: skill.creator?.email,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching skill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a skill
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, problemDescription, sop, status } = body;

    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (problemDescription !== undefined) updateData.problemDescription = problemDescription;
    if (sop !== undefined) updateData.sop = sop;
    if (status !== undefined && isValidSkillStatus(status)) updateData.status = status;

    // Update skill
    const skill = await prisma.skill.update({
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
      skill: {
        id: skill.id,
        name: skill.name,
        problemDescription: skill.problemDescription,
        sop: skill.sop,
        status: skill.status,
        createdBy: skill.creator?.email,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a skill
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Delete skill
    await prisma.skill.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
