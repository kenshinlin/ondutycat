import { prisma } from "@/lib/prisma";
import { Skill } from "@prisma/client";

/**
 * Skill cache entry with timestamp
 */
interface CacheEntry {
  skills: Skill[];
  timestamp: number;
}

/**
 * Skills Cache Service
 * Provides cached access to tenant skills with automatic refresh
 */
class SkillsCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get skills for a tenant, using cache if available
   */
  async getSkills(tenantId: string): Promise<Skill[]> {
    const now = Date.now();
    const cached = this.cache.get(tenantId);

    // Check if cache is valid
    if (cached && now - cached.timestamp < this.cacheTimeout) {
      return cached.skills;
    }

    // Cache miss or expired, fetch from database
    const skills = await this.fetchSkills(tenantId);

    // Update cache
    this.cache.set(tenantId, {
      skills,
      timestamp: now,
    });

    return skills;
  }

  /**
   * Fetch skills from database
   */
  private async fetchSkills(tenantId: string): Promise<Skill[]> {
    return prisma.skill.findMany({
      where: {
        tenantId,
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Invalidate cache for a specific tenant
   * Call this when skills are created, updated, or deleted
   */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Set cache timeout (in milliseconds)
   */
  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }

  /**
   * Get skills as a formatted list for prompts
   */
  async getSkillsPrompt(tenantId: string): Promise<string> {
    const skills = await this.getSkills(tenantId);

    return skills
      .map(
        (skill) =>
          `- **${skill.name}**: ${skill.problemDescription}`,
      )
      .join("\n");
  }

  /**
   * Find a skill by name
   */
  async getSkillByName(
    tenantId: string,
    skillName: string,
  ): Promise<Skill | null> {
    const skills = await this.getSkills(tenantId);
    return skills.find((s) => s.name === skillName) || null;
  }

  /**
   * Get all skill names for a tenant
   */
  async getSkillNames(tenantId: string): Promise<string[]> {
    const skills = await this.getSkills(tenantId);
    return skills.map((s) => s.name);
  }
}

// Export singleton instance
export const skillsCache = new SkillsCacheService();
