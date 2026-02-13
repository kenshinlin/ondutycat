# Agent Service

The agent service processes monitoring alerts using AI (LangChain with Anthropic Claude).

## Architecture

```
Alerts → Agent Runner → Skill Matcher → LangChain Agent → Issue Creation
              ↓                          ↓                      ↓
         Get recent alerts           Find matching SOP         Log steps
         (last 10 seconds)         (manual/semantic)        Create issue
```

## Components

### 1. Agent Runner ([runner.ts](./runner.ts))

Main coordinator that:
- Reads recent unprocessed alerts (last 10 seconds)
- Matches relevant skills (manual bindings or semantic)
- Invokes LangChain agent for analysis
- Creates issues and logs

### 2. Skill Matcher ([skill-matcher.ts](./skill-matcher.ts))

Two-stage matching:
1. **Manual Binding**: Checks `alert_skill_bindings` table for pattern matches
2. **Semantic Matching**: Keyword-based similarity search (TODO: embedding-based)

### 3. Agent Tools ([tools.ts](./tools.ts))

Tools available to the agent:
- `get_alert_details`: Fetch full alert information
- `search_similar_alerts`: Find historical patterns
- `get_skill_sop`: Retrieve Standard Operating Procedure
- `log_reasoning`: Log analysis steps
- `execute_custom_tool`: Run custom JavaScript tools (sandboxed)

## API Endpoint

### GET /api/agent/process

Trigger agent processing for a tenant.

**Query Parameters:**
- `tenant_id` (required): Tenant ID to process alerts for
- `dry_run` (optional): If true, simulate without creating issues

**Examples:**

```bash
# Process alerts for a tenant
curl "http://localhost:3000/api/agent/process?tenant_id=xxx-xxx-xxx"

# Dry run to test
curl "http://localhost:3000/api/agent/process?tenant_id=xxx&dry_run=true"
```

**Response:**

```json
{
  "success": true,
  "tenantId": "xxx",
  "processed": 1,
  "results": [
    {
      "issueId": "yyy",
      "alertIds": ["alert1", "alert2"],
      "conclusion": "REAL_ISSUE",
      "isRealIssue": true,
      "logs": [...]
    }
  ],
  "duration": "1234ms"
}
```

### POST /api/agent/process

Process alerts for multiple tenants.

**Body:**

```json
{
  "tenant_ids": ["tenant1", "tenant2", "tenant3"]
}
```

## Scheduled Execution

### Using cron

Add to crontab:

```cron
# Process alerts every 10 seconds
* * * * * * node /path/to/dod-platform/scripts/run-agent.js

# Or every minute
* * * * * * node /path/to/dod-platform/scripts/run-agent.js
```

### Using the script directly

```bash
# Set environment variables
export API_URL=http://localhost:3000
export TENANT_ID=your-tenant-id

# Run manually
node scripts/run-agent.js

# Dry run to test
node scripts/run-agent.js --dry-run

# Process specific tenant
node scripts/run-agent.js --tenant-id=specific-tenant-id
```

## Environment Variables

Required for agent execution:
- `ANTHROPIC_API_KEY`: API key for Claude (Sonnet 4.5)
- `DATABASE_URL`: PostgreSQL connection string

Optional:
- `API_URL`: Base URL for cron script (default: http://localhost:3000)
- `TENANT_ID`: Default tenant to process

## Processing Flow

1. **Read Alerts**: Get unprocessed `open` alerts from last 10 seconds
2. **Match Skill**: Find relevant skill via manual binding or semantic search
3. **Load Tools**: Get available tools (including custom tools)
4. **Run Agent**: Invoke LangChain agent with context
5. **Create Issue**: Store analysis result as issue
6. **Log Steps**: Record all agent actions for audit trail
7. **Update Alerts**: Mark alerts as `investigating`

## Skill Matching Priority

1. **Manual Binding** (Priority: High)
   - Pattern match from `alert_skill_bindings` table
   - Supports regex: `/pattern/`
   - Supports plain text: `keyword`
   - Checks: title, alert_type, description

2. **Semantic Matching** (Priority: Medium)
   - Keyword similarity search
   - Compares: alert text vs skill name, problem description, SOP
   - Score: common words / max unique words
   - Threshold: >0.1 (10% similarity)

3. **No Match** (Priority: None)
   - Agent operates without specific SOP
   - Uses general analysis guidelines

## Tool Execution

Custom code tools are executed with these safeguards:

1. **Tool Lookup**: Fetch tool from database by ID
2. **Status Check**: Verify tool is `active`
3. **Code Execution**: Run JavaScript in async function context
4. **Error Handling**: Catch and return execution errors

**⚠️ Security Warning**: Current implementation uses `new AsyncFunction()` which is not sandboxed. For production, use:
- `vm2` package
- `isolated-vm` package
- Docker container execution

## Future Enhancements

1. **Vector Embeddings**: Replace keyword matching with pgvector similarity search
2. **Multi-tenant Processing**: Batch process multiple tenants efficiently
3. **Async Queue**: Use job queue (Bull/BullMQ) for background processing
4. **Tool Sandbox**: Proper isolation for custom code execution
5. **MCP Integration**: Support Model Context Protocol tools
6. **Skill Progress**: Track and report skill effectiveness over time

## Troubleshooting

### No alerts processed

- Check if alerts have `status: open`
- Verify `received_at` is within last 10 seconds
- Check tenant status is `active`

### Skill not matching

- Verify skill status is `active`
- Check manual binding patterns
- Review keyword similarity threshold

### Agent timeout

- Increase timeout in API route
- Check Anthropic API rate limits
- Reduce number of alerts processed per batch

### Custom tool errors

- Verify tool customCode is valid JavaScript
- Check console errors for syntax issues
- Test tool manually before deploying
