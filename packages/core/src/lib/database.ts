/**
 * Database client interface
 */

export interface DatabaseClient {
  query(sql: string, params: unknown[]): Promise<{ rows: any[] }>;
}
