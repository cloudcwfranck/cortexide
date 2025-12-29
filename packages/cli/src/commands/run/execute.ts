/**
 * cortexide run execute
 *
 * Execute a deployment run
 */

import { Command, Flags } from '@oclif/core';

export default class Execute extends Command {
  static description = 'Execute a deployment run';

  static flags = {
    env: Flags.string({ char: 'e', description: 'Environment ID', required: true }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Execute);

    this.log(`🚀 Executing run for environment: ${flags.env}`);
    this.log('TODO: Implement API call to POST /runs/execute');
  }
}
