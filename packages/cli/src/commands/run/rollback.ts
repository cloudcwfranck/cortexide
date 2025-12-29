/**
 * cortexide run rollback
 *
 * Rollback a deployment run
 */

import { Command, Args } from '@oclif/core';

export default class Rollback extends Command {
  static description = 'Rollback a deployment run';

  static args = {
    run_id: Args.string({ description: 'Run ID to rollback', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Rollback);

    this.log(`⏮️  Rolling back run: ${args.run_id}`);
    this.log('TODO: Implement API call to POST /runs/:run_id/rollback');
  }
}
