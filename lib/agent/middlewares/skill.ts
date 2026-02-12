import { createMiddleware } from "langchain";
import { loadSkill } from "../tools/load-skill";
import { z } from "zod";
import { skillsCache } from "../skills-cache";

const contextSchema = z.object({
  // [!code highlight]
  tenantId: z.string(), // 当前 team ID，作为 agent 参数
});

const skillMiddleware = createMiddleware({
  name: "skillMiddleware",
  tools: [loadSkill],
  contextSchema,
  wrapModelCall: async (request, handler) => {
    const tenantId = request.runtime.context?.tenantId;

    if (!tenantId) {
      console.warn("tenantId not found in context, skipping skill middleware");
      return handler(request);
    }

    // Build the skills addendum with cached skills
    const skillsPrompt = await skillsCache.getSkillsPrompt(tenantId);
    const skillsAddendum =
      `\n\n## Available Skills\n\n${skillsPrompt}\n\n` +
      `Use the \`load_skill\` tool (@NOTE: tenantId=${tenantId}) when you need detailed information about handling a specific type of request.` +
      "\n\n" +
      "This will provide you with comprehensive instructions, policies, and guidelines for the skill area.";

    // Append to system prompt
    const newSystemPrompt = request.systemPrompt + skillsAddendum;

    return handler({
      ...request,
      systemPrompt: newSystemPrompt,
    });
  },
});

export { skillMiddleware };
