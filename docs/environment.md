# BotolaHub Environment Configuration

## Environment Variables (.env)

| Variable              | Default Value            | Description                                          |
| :-------------------- | :----------------------- | :--------------------------------------------------- |
| `NODE_ENV`            | `development`            | Node execution environment                           |
| `APP_ENV`             | `local`                  | Application stage (`local`, `staging`, `production`) |
| `PORT_API`            | `3000`                   | NestJS API listening port                            |
| `PORT_WEB`            | `3001`                   | User Next.js application port                        |
| `PORT_ADMIN`          | `3002`                   | Admin Next.js application port                       |
| `PORT_MOBILE`         | `8081`                   | Expo Metro bundler port                              |
| `POSTGRES_USER`       | `botolahub`              | PostgreSQL database user                             |
| `POSTGRES_PASSWORD`   | `botolahub_dev_secret`   | PostgreSQL database password                         |
| `POSTGRES_DB`         | `botolahub_dev`          | PostgreSQL database name                             |
| `POSTGRES_PORT`       | `5432`                   | PostgreSQL container port                            |
| `DATABASE_URL`        | `postgresql://...`       | Prisma database connection string                    |
| `REDIS_HOST`          | `localhost`              | Redis host                                           |
| `REDIS_PORT`          | `6379`                   | Redis port                                           |
| `REDIS_URL`           | `redis://localhost:6379` | Redis connection URI                                 |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000`  | Public API URL for web apps                          |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000`  | Public API URL for mobile app                        |
