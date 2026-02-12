// Test script for v8-sandbox run-code tool
// Tests basic code execution and fetch functionality

import { Sandbox } from "v8-sandbox";

console.log("=== Testing v8-sandbox ===\n");

// Test 1: Basic synchronous execution
console.log("Test 1: Basic synchronous execution");
try {
  const sandbox1 = new Sandbox({
    httpEnabled: true,
    timersEnabled: true,
    memory: 128,
  });

  const code1 = `
    setResult({ value: { success: true, result: INPUT.x + INPUT.y } });
  `;

  const result1 = await sandbox1.execute({
    code: code1,
    timeout: 5000,
    globals: { INPUT: { x: 5, y: 3 } },
  });

  await sandbox1.shutdown();
  console.log("Result:", JSON.stringify(result1, null, 2));
  console.log("✓ Test 1 passed\n");
} catch (error) {
  console.error("✗ Test 1 failed:", error.message, "\n");
}

// Test 2: Async execution with setTimeout
console.log("Test 2: Async execution with setTimeout");
try {
  const sandbox2 = new Sandbox({
    httpEnabled: true,
    timersEnabled: true,
    memory: 128,
  });

  const code2 = `
    setTimeout(() => {
      setResult({ value: { success: true, result: INPUT.x * INPUT.y } });
    }, 100);
  `;

  const result2 = await sandbox2.execute({
    code: code2,
    timeout: 5000,
    globals: { INPUT: { x: 4, y: 7 } },
  });

  await sandbox2.shutdown();
  console.log("Result:", JSON.stringify(result2, null, 2));
  console.log("✓ Test 2 passed\n");
} catch (error) {
  console.error("✗ Test 2 failed:", error.message, "\n");
}

// Test 3: HTTP request with httpRequest
console.log("Test 3: HTTP request with httpRequest");
try {
  const sandbox3 = new Sandbox({
    httpEnabled: true,
    timersEnabled: true,
    memory: 128,
  });

  const code3 = `
    httpRequest('https://jsonplaceholder.typicode.com/posts/1', (error, result) => {
      if (error) {
        setResult({ value: { success: false, error: String(error) } });
      } else {
        setResult({ value: { success: true, result: JSON.parse(result.body) } });
      }
    });
  `;

  const result3 = await sandbox3.execute({
    code: code3,
    timeout: 10000,
    globals: {},
  });

  await sandbox3.shutdown();
  console.log("Result:", JSON.stringify(result3, null, 2));
  console.log("✓ Test 3 passed\n");
} catch (error) {
  console.error("✗ Test 3 failed:", error.message, "\n");
}

// Test 4: Error handling
console.log("Test 4: Error handling");
try {
  const sandbox4 = new Sandbox({
    httpEnabled: true,
    timersEnabled: true,
    memory: 128,
  });

  const code4 = `
    try {
      throw new Error("Test error");
    } catch (error) {
      setResult({ value: { success: false, error: error.message } });
    }
  `;

  const result4 = await sandbox4.execute({
    code: code4,
    timeout: 5000,
    globals: {},
  });

  await sandbox4.shutdown();
  console.log("Result:", JSON.stringify(result4, null, 2));
  console.log("✓ Test 4 passed\n");
} catch (error) {
  console.error("✗ Test 4 failed:", error.message, "\n");
}

// Test 5: Timeout handling
console.log("Test 5: Timeout handling (infinite loop)");
try {
  const sandbox5 = new Sandbox({
    httpEnabled: true,
    timersEnabled: true,
    memory: 128,
  });

  const code5 = `
    while (true) {}
  `;

  const result5 = await sandbox5.execute({
    code: code5,
    timeout: 1000,
    globals: {},
  });

  await sandbox5.shutdown();
  console.log("Result:", JSON.stringify(result5, null, 2));

  if (result5.error && result5.error.isTimeout) {
    console.log("✓ Test 5 passed (timeout correctly detected)\n");
  } else {
    console.log("✗ Test 5 failed (timeout not detected)\n");
  }
} catch (error) {
  console.error("✗ Test 5 failed:", error.message, "\n");
}

// Test 6: Function execution pattern (similar to run-code.ts)
console.log("Test 6: Function execution pattern");
try {
  const sandbox6 = new Sandbox({
    httpEnabled: true,
    timersEnabled: true,
    memory: 128,
  });

  const code6 = `
    (function() {
      try {
        var tool = INPUT.x + INPUT.y;
        setResult({ value: { success: true, result: tool } });
      } catch (error) {
        setResult({ value: { success: false, error: error.message } });
      }
    })();
  `;

  const result6 = await sandbox6.execute({
    code: code6,
    timeout: 5000,
    globals: { INPUT: { x: 10, y: 20 } },
  });

  await sandbox6.shutdown();
  console.log("Result:", JSON.stringify(result6, null, 2));
  console.log("✓ Test 6 passed\n");
} catch (error) {
  console.error("✗ Test 6 failed:", error.message, "\n");
}

console.log("=== All tests completed ===");
