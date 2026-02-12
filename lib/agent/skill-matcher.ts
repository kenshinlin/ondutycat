import { prisma } from "@/lib/prisma";
import { Alert, Skill, AlertSkillBinding } from "@prisma/client";
import { SkillMatch } from "./types";

/**
 * Match skills to alerts using both manual bindings and semantic matching
 */
export class SkillMatcher {
  /**
   * Find matching skill for a given alert
   * Priority: Manual bindings > Semantic matching > No match
   */
  async matchSkill(alerts: Alert[]): Promise<SkillMatch[] | null> {
    // First try manual binding (highest priority)
    const manualMatch = await this.matchManualBinding(alerts);
    if (manualMatch && manualMatch.length > 0) {
      return manualMatch;
    }

    return null;
  }

  async allSkills(tenantId: string): Promise<SkillMatch[]> {
    const skills = await prisma.skill.findMany({
      where: {
        tenantId,
      },
    });

    return skills.map((skill) => ({
      skill,
      matchType: "none" as "none",
    }));
  }

  /**
   * Match alert to skill using manual alert_skill_bindings
   * Checks if alert title or type matches the pattern
   */
  private async matchManualBinding(alerts: Alert[]): Promise<SkillMatch[]> {
    const bindings = await prisma.alertSkillBinding.findMany({
      where: {
        tenantId: alerts[0].tenantId,
      },
      include: {
        skill: true,
      },
      orderBy: {
        priority: "desc", // Higher priority first
      },
    });

    const skills = [];
    for (const binding of bindings) {
      for (const alert of alerts) {
        if (this.patternMatches(binding.alertPattern, alert)) {
          skills.push({
            skill: binding.skill,
            matchType: "manual_binding" as
              | "manual_binding"
              | "semantic"
              | "none",
            confidence: 1.0, // Manual binding has highest confidence
          });
        }
      }
    }

    return skills;
  }

  /**
   * Check if pattern matches alert
   * Pattern can be:
   * - Plain text substring match
   * - Regex pattern (wrapped in /.../)
   */
  private patternMatches(pattern: string, alert: Alert): boolean {
    // Check if pattern is regex (wrapped in /...)
    if (pattern.startsWith("/") && pattern.endsWith("/")) {
      try {
        const regexPattern = pattern.slice(1, -1);
        const regex = new RegExp(regexPattern, "i");
        return regex.test(alert.title);
      } catch {
        // Invalid regex, treat as plain text
        return pattern.toLowerCase().includes(alert.title.toLowerCase());
      }
    }

    // Plain text match
    const lowerPattern = pattern.toLowerCase();
    return (
      alert.title.toLowerCase().includes(lowerPattern) ||
      alert.alertType.toLowerCase().includes(lowerPattern) ||
      (alert.description?.toLowerCase().includes(lowerPattern) ?? false)
    );
  }
}

// Singleton instance
export const skillMatcher = new SkillMatcher();
