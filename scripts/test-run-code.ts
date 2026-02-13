// Test script for run-code tool
import { runCodeTool } from '../lib/agent/tools/run-code.ts';

async function testRunCode() {
  console.log('=== Test 1: Simple calculation ===');
  const result1 = await runCodeTool.invoke({
    code: 'return INPUT.x + INPUT.y;',
    input: { x: 5, y: 3 }
  });
  console.log('Result:', result1);
  console.log('\n');

  console.log('=== Test 2: HTTP request ===');
  const result2 = await runCodeTool.invoke({
    code: `
      const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      return res.data;
    `,
    timeout: 10000
  });
  console.log('Result:', result2);
  console.log('\n');

  console.log('=== Test 3: Console output ===');
  const result3 = await runCodeTool.invoke({
    code: `
      console.log('Hello from VM!');
      console.warn('This is a warning');
      console.error('This is an error');
      return 'Done';
    `
  });
  console.log('Result:', result3);
  console.log('\n');

  console.log('=== Test 4: JSON processing ===');
  const result4 = await runCodeTool.invoke({
    code: `
      const data = INPUT.items;
      return data.map(x => x * 2);
    `,
    input: { items: [1, 2, 3, 4, 5] }
  });
  console.log('Result:', result4);
  console.log('\n');

  console.log('=== Test 5: Error handling ===');
  const result5 = await runCodeTool.invoke({
    code: `
      throw new Error('Test error');
    `
  });
  console.log('Result:', result5);
  console.log('\n');

  console.log('=== Test 6: Timeout test ===');
  const result6 = await runCodeTool.invoke({
    code: `
      await new Promise(resolve => setTimeout(resolve, 6000));
      return 'Should not reach here';
    `,
    timeout: 2000
  });
  console.log('Result:', result6);
  console.log('\n');

  console.log('=== Test 7: Complex async operations ===');
  const result7 = await runCodeTool.invoke({
    code: `
      const res1 = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const res2 = await fetch('https://jsonplaceholder.typicode.com/posts/2');
      return {
        post1: res1.data.title,
        post2: res2.data.title
      };
    `,
    timeout: 15000
  });
  console.log('Result:', result7);
  console.log('\n');
}

testRunCode().catch(console.error);
