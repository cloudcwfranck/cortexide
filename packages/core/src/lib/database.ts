/**
 * Database client interface
 */

export interface DatabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<T = any>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
}
