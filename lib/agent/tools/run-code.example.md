# Run Code Tool

## Overview

The `runCodeTool` provides a secure way to execute JavaScript code in an isolated VM environment using [`isolated-vm`](https://github.com/laverdet/isolated-vm). This prevents untrusted code from affecting the main process.

## Features

- **Isolated Execution**: Code runs in a separate V8 isolate with no access to the main process
- **Memory Limits**: Configurable memory limit (default 128MB)
- **Timeout Protection**: Configurable execution timeout (default 5000ms)
- **Safe Input/Output**: Input data is safely copied, output is serialized
- **Error Handling**: Comprehensive error handling for timeouts, memory limits, and runtime errors

## Usage

### Basic Example

```typescript
import { runCodeTool } from '@/lib/agent/tools/run-code';

const result = await runCodeTool.invoke({
  code: '(input) => { return input.x + input.y; }',
  input: { x: 5, y: 3 },
});

// Result: { "success": true, "result": 8, "executionTime": 2 }
```

### With LangChain Agent

```typescript
import { tool } from "langchain";
import { runCodeTool } from '@/lib/agent/tools/run-code';

// Add to your agent's tools array
const tools = [runCodeTool, /* other tools */];

// The agent can now use it:
// Agent: "Calculate 5 + 3"
// Tool call: run_code({ code: "() => 5 + 3" })
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `code` | `string` | required | JavaScript function code that accepts INPUT |
| `input` | `Record<string, unknown>` | `{}` | Data to pass to the code function |
| `timeout` | `number` | `5000` | Maximum execution time in milliseconds |
| `memoryLimit` | `number` | `128` | Memory limit in MB |

## Return Format

```typescript
{
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime?: number;
}
```

## Security Considerations

- The code has **no access** to: file system, network, process globals, or main process memory
- Only the `INPUT` object is available to the code
- Memory and timeout limits prevent resource exhaustion
- The isolate is disposed after execution

## Examples

### Data Transformation

```typescript
await runCodeTool.invoke({
  code: `(input) => {
    return input.items.map(item => ({
      ...item,
      total: item.price * item.quantity
    }));
  }`,
  input: {
    items: [
      { name: "Apple", price: 1.5, quantity: 3 },
      { name: "Banana", price: 0.5, quantity: 10 }
    ]
  }
});
```

### Validation

```typescript
await runCodeTool.invoke({
  code: `(input) => {
    const email = input.email;
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return {
      valid: emailRegex.test(email),
      email: email
    };
  }`,
  input: { email: "user@example.com" }
});
```

### Custom Logic

```typescript
await runCodeTool.invoke({
  code: `(input) => {
    const calculateDiscount = (total) => {
      if (total > 1000) return 0.2;
      if (total > 500) return 0.1;
      return 0;
    };

    const discount = calculateDiscount(input.total);
    return {
      originalTotal: input.total,
      discountPercent: discount * 100,
      finalTotal: input.total * (1 - discount)
    };
  }`,
  input: { total: 1200 }
});
```

## Limitations

- Cannot perform file I/O operations
- Cannot make network requests
- Cannot access external modules or dependencies
- Must complete within timeout limit
- Memory is constrained to the specified limit

## Testing

Run the test suite:

```bash
npx ts-node scripts/test-run-code.ts
```
