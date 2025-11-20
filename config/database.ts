export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'saas_db_jgb3'),
      user: env('DATABASE_USERNAME', 'saas_user'),
      password: env('DATABASE_PASSWORD', 'ykTymP9Lxcud3ANzYUd3uqkYfpii2Vni'),
      ssl: env.bool('DATABASE_SSL', false) ? { rejectUnauthorized: false } : false,
    },
    debug: false,
  },
});