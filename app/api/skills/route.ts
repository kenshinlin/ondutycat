import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SkillStatus } from '@prisma/client';

// Validate skill status
function isValidSkillStatus(status: string): status is SkillStatus {
  return ['active', 'inactive'].includes(status);
}

// GET - List all skills for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');
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

    if (status && isValidSkillStatus(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { problemDescription: { contains: search, mode: 'insensitive' } },
        { sop: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skills = await prisma.skill.findMany({
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

    const total = await prisma.skill.count({ where });

    return NextResponse.json({
      skills: skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        problemDescription: skill.problemDescription,
        sop: skill.sop,
        status: skill.status,
        createdBy: skill.creator?.email,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new skill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, name, problemDescription, sop, status, createdBy } = body;

    // Validate required fields
    if (!tenantId || !name || !problemDescription || !sop) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, name, problemDescription, sop' },
        { status: 400 }
      );
    }

    // Validate status
    const skillStatus: SkillStatus = status && isValidSkillStatus(status) ? status : 'active';

    // Create skill
    const skill = await prisma.skill.create({
      data: {
        tenantId,
        name,
        problemDescription,
        sop,
        status: skillStatus,
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
