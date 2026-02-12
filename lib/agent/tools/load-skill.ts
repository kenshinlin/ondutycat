import { tool } from "langchain";
import { z } from "zod";
import { skillsCache } from "../skills-cache";

export const loadSkill = tool(
  async ({ tenantId, skillName }, config) => {
    // Get tenantId from config
    tenantId = tenantId || (config?.configurable?.tenantId as string);

    if (!tenantId) {
      return "Error: tenantId is required to load skills";
    }

    // Find and return the requested skill
    const skill = await skillsCache.getSkillByName(tenantId, skillName);
    if (skill) {
      return `Loaded skill: ${skillName}\n\n${skill.sop}`;
    }

    // Skill not found
    const available = await skillsCache.getSkillNames(tenantId);
    return `Skill '${skillName}' not found. Available skills: ${available.join(", ")}`;
  },
  {
    name: "load_skill",
    description: `Load the full content of a skill into the agent's context.

Use this when you need detailed information about how to handle a specific
type of request. This will provide you with comprehensive instructions,
policies, and guidelines for the skill area.`,
    schema: z.object({
      tenantId: z.string().describe("The tenant ID to load skills"),
      skillName: z.string().describe("The name of the skill to load"),
    }),
  },
);
