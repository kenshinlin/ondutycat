import { prisma } from '@/lib/prisma';
import { Alert, Skill, AlertSkillBinding } from '@prisma/client';
import { SkillMatch } from './types';

/**
 * Match skills to alerts using both manual bindings and semantic matching
 */
export class SkillMatcher {
  /**
   * Find matching skill for a given alert
   * Priority: Manual bindings > Semantic matching > No match
   */
  async matchSkill(alert: Alert): Promise<SkillMatch | null> {
    // First try manual binding (highest priority)
    const manualMatch = await this.matchManualBinding(alert);
    if (manualMatch) {
      return manualMatch;
    }

    // Then try semantic matching
    const semanticMatch = await this.matchSemantic(alert);
    if (semanticMatch) {
      return semanticMatch;
    }

    return null;
  }

  /**
   * Match alert to skill using manual alert_skill_bindings
   * Checks if alert title or type matches the pattern
   */
  private async matchManualBinding(alert: Alert): Promise<SkillMatch | null> {
    const bindings = await prisma.alertSkillBinding.findMany({
      where: {
        tenantId: alert.tenantId,
      },
      include: {
        skill: true,
      },
      orderBy: {
        priority: 'desc', // Higher priority first
      },
    });

    for (const binding of bindings) {
      if (this.patternMatches(binding.alertPattern, alert)) {
        return {
          skill: binding.skill,
          matchType: 'manual_binding',
          confidence: 1.0, // Manual binding has highest confidence
        };
      }
    }

    return null;
  }

  /**
   * Check if pattern matches alert
   * Pattern can be:
   * - Plain text substring match
   * - Regex pattern (wrapped in /.../)
   */
  private patternMatches(pattern: string, alert: Alert): boolean {
    // Check if pattern is regex (wrapped in /...)
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      try {
        const regexPattern = pattern.slice(1, -1);
        const regex = new RegExp(regexPattern, 'i');
        return (
          regex.test(alert.title) ||
          regex.test(alert.alertType) ||
          (alert.description && regex.test(alert.description))
        );
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

  /**
   * Match alert to skill using semantic similarity
   * Uses embedding-based similarity search
   * Note: This requires pgvector extension and embedding generation
   * For now, implement basic keyword matching as fallback
   */
  private async matchSemantic(alert: Alert): Promise<SkillMatch | null> {
    // Get all active skills for this tenant
    const skills = await prisma.skill.findMany({
      where: {
        tenantId: alert.tenantId,
        status: 'active',
      },
    });

    if (skills.length === 0) {
      return null;
    }

    // Build search text from alert
    const searchText = [
      alert.title,
      alert.alertType,
      alert.description || '',
    ].join(' ').toLowerCase();

    // Simple keyword matching for now
    // TODO: Implement proper embedding-based semantic search
    let bestMatch: Skill | null = null;
    let bestScore = 0;

    for (const skill of skills) {
      const skillText = [
        skill.name,
        skill.problemDescription,
        skill.sop,
      ].join(' ').toLowerCase();

      const score = this.calculateKeywordSimilarity(searchText, skillText);

      if (score > bestScore && score > 0.1) {
        bestScore = score;
        bestMatch = skill;
      }
    }

    if (bestMatch) {
      return {
        skill: bestMatch,
        matchType: 'semantic',
        confidence: bestScore,
      };
    }

    return null;
  }

  /**
   * Calculate keyword similarity score
   * Simple implementation: count common words / total unique words
   */
  private calculateKeywordSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) {
      return 0;
    }

    let common = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        common++;
      }
    }

    return common / Math.max(words1.size, words2.size);
  }
}

// Singleton instance
export const skillMatcher = new SkillMatcher();
