/**
 * cortexide evidence fetch
 *
 * Fetch evidence bundle for a run
 */

import { Command, Args, Flags } from '@oclif/core';

export default class Fetch extends Command {
  static description = 'Fetch evidence bundle for a run';

  static args = {
    run_id: Args.string({ description: 'Run ID', required: true }),
  };

  static flags = {
    format: Flags.string({
      char: 'f',
      description: 'Output format',
      options: ['json', 'zip'],
      default: 'json',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Fetch);

    this.log(`📦 Fetching evidence for run: ${args.run_id} (format: ${flags.format})`);
    this.log('TODO: Implement API call to GET /runs/:run_id/evidence');
  }
}
