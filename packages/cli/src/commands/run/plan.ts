/**
 * cortexide run plan
 *
 * Dry-run a deployment (no lock acquired)
 */

import { Command, Flags } from '@oclif/core';

export default class Plan extends Command {
  static description = 'Dry-run a deployment plan';

  static flags = {
    env: Flags.string({ char: 'e', description: 'Environment ID', required: true }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Plan);

    this.log(`📋 Planning deployment for environment: ${flags.env}`);
    this.log('TODO: Implement API call to POST /runs/plan');
  }
}
