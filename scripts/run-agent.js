/**
 * Cron job script to trigger agent processing for all active tenants
 *
 * Usage:
 *   node scripts/run-agent.js
 *   node scripts/run-agent.js --tenant-id=<specific-tenant-id>
 *   node scripts/run-agent.js --dry-run
 *
 * Environment variables:
 *   - API_URL: Base URL of the API (default: http://localhost:3000)
 *   - TENANT_ID: Specific tenant ID to process (default: query from DB)
 */

const http = require('http');

/**
 * Trigger agent processing for a tenant via API
 */
async function processTenant(apiUrl, tenantId, dryRun = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${apiUrl}/api/agent/process`);
    url.searchParams.append('tenant_id', tenantId);
    if (dryRun) {
      url.searchParams.append('dry_run', 'true');
    }

    console.log(`[${new Date().toISOString()}] Processing tenant: ${tenantId}`);
    console.log(`  URL: ${url}`);

    const req = http.get(url.toString(), (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`[${new Date().toISOString()}] Completed: ${tenantId}`);
          console.log(`  Status: ${res.statusCode}`);
          console.log(`  Processed: ${result.processed || 0} alerts`);
          console.log(`  Duration: ${result.duration || 'unknown'}`);

          if (result.error) {
            console.error(`  Error: ${result.error}`);
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${result.error || 'Unknown error'}`));
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout after 30s'));
    });
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificTenant = args.find(arg => arg.startsWith('--tenant-id='))?.split('=')[1];

  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const tenantId = process.env.TENANT_ID;

  if (!specificTenant && !tenantId) {
    console.error('Error: No tenant specified');
    console.error('Usage:');
    console.error('  node scripts/run-agent.js --tenant-id=<tenant-id>');
    console.error('  TENANT_ID=<id> node scripts/run-agent.js');
    console.error('  --dry-run: Test mode without creating issues');
    process.exit(1);
  }

  try {
    const targetTenant = specificTenant || tenantId;

    console.log('========================================');
    console.log(`DOD Agent - Alert Processing`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('========================================\n');

    await processTenant(apiUrl, targetTenant, dryRun);

    console.log('\n========================================');
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log('========================================');
  } catch (error) {
    console.error('\n========================================');
    console.error('Error executing agent:');
    console.error(error.message);
    console.error('========================================');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, processTenant };
