# MCP Tool Selection - UI/UX Testing Guide

## Overview
This feature enables two-level tool selection in SOP Editor:
1. **First Level**: Select from available tools (MCP tools have special icon)
2. **Second Level**: For MCP tools, fetch and select specific MCP server tools
3. **Result**: Tools are inserted as `{{server_name.tool_name}}` format with highlight

## Testing Setup

### 1. Mock Data
The application is pre-configured with mock MCP tools in `app/[locale]/skills/page.tsx`:

- **Filesystem MCP** (`tool-mcp-fs`):
  - Simulates filesystem operations (read, write, list directory, search)
  - Returns tools: `read_file`, `write_file`, `list_directory`, `search_files`

- **PostgreSQL MCP** (`tool-mcp-pg`):
  - Simulates database operations
  - Returns tools: `query`, `execute_sql`, `get_schema`, `list_tables`

- **Prometheus MCP** (`tool-mcp-prom`):
  - Simulates metrics operations
  - Returns tools: `query`, `query_range`, `list_metrics`, `get_labels`

### 2. Mock API
A mock API endpoint is available at `/api/mcp-tools-mock` for testing without real MCP servers.

Currently enabled in `app/[locale]/skills/page.tsx`:
```tsx
<SkillDrawer
  ...
  useMockApi={true}  // Uses mock API for testing
/>
```

## Testing Steps

### Test 1: Non-MCP Tool Selection
1. Navigate to `/skills` page
2. Click "Create Skill" button
3. In the SOP editor, type `@` or `/`
4. First popup appears showing available tools
5. Click on a non-MCP tool (e.g., "Database_Health_Check")
6. ✅ Tool should be inserted directly as `{{Database_Health_Check}}`

### Test 2: MCP Tool Selection - Filesystem
1. In SOP editor, type `@` or `/`
2. First popup appears
3. Click on "Filesystem MCP" (has blue Plug icon + right arrow)
4. ✅ Second popup appears with:
   - Blue header with "Filesystem MCP" title
   - Search input placeholder: "Search Filesystem MCP tools..."
   - Loading spinner (500ms simulated delay)
   - List of 4 tools: `read_file`, `write_file`, `list_directory`, `search_files`
5. Click on "read_file"
6. ✅ Tool inserted as: `{{filesystem.read_file}}`
7. ✅ Tool is displayed in editor with blue gradient background highlight
8. ✅ Cursor is moved to end of editor

### Test 3: MCP Tool Selection - PostgreSQL
1. Type `@` or `/` in SOP editor
2. Click on "PostgreSQL MCP"
3. ✅ Second popup shows PostgreSQL tools:
   - `query` - Execute a PostgreSQL query
   - `execute_sql` - Execute SQL and return results
   - `get_schema` - Get database schema information
   - `list_tables` - List all tables in the database
4. Select "get_schema"
5. ✅ Inserted as: `{{postgres.get_schema}}`

### Test 4: MCP Tool Selection - Prometheus
1. Type `@` or `/` in SOP editor
2. Click on "Prometheus MCP"
3. ✅ Second popup shows Prometheus tools:
   - `query` - Execute PromQL query
   - `query_range` - Execute PromQL range query
   - `list_metrics` - List all available metrics
   - `get_labels` - Get label values for a metric
4. Select "query_range"
5. ✅ Inserted as: `{{prometheus.query_range}}`

### Test 5: Search Functionality
1. Type `@` to open first popup
2. Type "mcp" in search
3. ✅ Only MCP tools should be shown
4. Click "Filesystem MCP"
5. In second popup, type "file"
6. ✅ Only tools matching "file" shown: `read_file`, `write_file`, `list_directory`

### Test 6: Keyboard Navigation
1. Type `@` to open first popup
2. Press `Escape`
3. ✅ First popup closes
4. Type `@` again and click "Filesystem MCP"
5. Press `Escape`
6. ✅ Second popup closes, returns to first popup
7. Press `Escape` again
8. ✅ First popup closes

### Test 7: Error Handling
To test error handling, you can modify the mock API or disable network:
1. Open browser DevTools Network tab
2. Try selecting MCP tool
3. Check that `/api/mcp-tools-mock?tool_id=xxx` request is made
4. To simulate error: Temporarily change API endpoint in SOPEditor.tsx

## Visual Feedback

### First Popup (Tool Selection)
- **Header**: Gray background with search icon
- **MCP Tools**:
  - Blue Plug icon on left
  - Right arrow (ChevronRight) on hover
  - Hover: gray background
- **Non-MCP Tools**:
  - No icon
  - No right arrow
  - Hover: gray background

### Second Popup (MCP Tool Selection)
- **Header**: Blue background
  - Plug icon (blue)
  - Search input with blue text
  - Loading spinner (when fetching)
- **Tool List**:
  - Hover: blue background (bg-blue-50)
  - Tool name: blue on hover (text-blue-700)
- **Footer**:
  - Blue background
  - Hint text: "Select an MCP tool to insert as <server>.<tool>"

### Inserted Tool Format
```
{{filesystem.read_file}}
{{postgres.get_schema}}
{{prometheus.query_range}}
```

Each tool appears with:
- Blue gradient background (#dbeafe → #e0e7ff)
- Blue text (#1e40af)
- Rounded corners (4px)
- 2px horizontal margin

## Switching to Real API

To use real MCP servers instead of mock data:

1. Update `app/[locale]/skills/page.tsx`:
```tsx
<SkillDrawer
  ...
  useMockApi={false}  // Use real API
/>
```

2. Ensure MCP tools are configured in database with proper `config.mcpServers`

3. The real API `/api/mcp-tools` will:
   - Fetch tool from database
   - Connect to actual MCP server
   - Return real tool list

## Troubleshooting

**Problem**: MCP tools don't show the second popup
- **Solution**: Check that tool has `type: 'mcp'` in mockTools array

**Problem**: Second popup shows error
- **Solution**: Check browser console and Network tab for API errors

**Problem**: Tool format is incorrect
- **Solution**: Ensure config has `mcpServers` object with server name as key

## Files Modified

1. **API**: `app/api/mcp-tools/route.ts` - Real MCP API
2. **Mock API**: `app/api/mcp-tools-mock/route.ts` - Testing mock
3. **Component**: `components/skills/SOPEditor.tsx` - Main editor with two-level selection
4. **Component**: `components/skills/SkillDrawer.tsx` - Passes useMockApi prop
5. **Page**: `app/[locale]/skills/page.tsx` - Mock MCP tools + useMockApi flag

**Problem**: Tool doesn't show up after selection
- **Solution**: Fixed! The issue was useEffect overwriting manual innerHTML updates. Now uses `isUpdatingFromOutside` flag to prevent conflicts.

