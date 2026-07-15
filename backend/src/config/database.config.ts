import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { entities } from '../entities';

config();

export function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'postgres';
  const password = encodeURIComponent(process.env.DB_PASSWORD ?? '');
  const database = process.env.DB_NAME ?? 'family_tree';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: buildDatabaseUrl(),
    synchronize: false,
    logging: process.env.APP_ENV === 'development',
    entities,
  };
}

export const cliDataSource = new DataSource({
  ...(getTypeOrmConfig() as DataSourceOptions),
  migrations: ['src/migrations/**/*.ts'],
});
