/**
 * cortexide init
 *
 * Initialize Cortexide CLI configuration
 */

import { Command } from '@oclif/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export default class Init extends Command {
  static description = 'Initialize Cortexide CLI configuration';

  async run(): Promise<void> {
    const configDir = path.join(os.homedir(), '.cortexide');
    const configPath = path.join(configDir, 'config.json');

    // Create config directory
    await fs.mkdir(configDir, { recursive: true });

    // Default config
    const config = {
      api_endpoint: 'http://localhost:3000/api/v1',
      api_key: 'cortexide-dev-key-v01',
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

    this.log(`✅ Cortexide CLI configured at ${configPath}`);
    this.log(`API endpoint: ${config.api_endpoint}`);
  }
}
