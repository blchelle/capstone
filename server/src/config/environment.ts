import dotenv from 'dotenv';

export type NodeEnv = 'development'| 'production' | 'test';

interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number;
}

interface JWTConfig {
  secret: string;
  expiryTime: number;
  secure: boolean;
}

interface MailerConfig {
  apiKey: string
  username: string
  resetPasswordTemplateId: string
}

interface Environment {
  baseClientUrl: string,
  clientUrls: string[];
  rateLimits: RateLimitConfig[];
  jwt: JWTConfig;
  mailer?: MailerConfig // Wont exist in development
}

// Must load the .env file before initializing the environment
let path;
const envName = process.env.NODE_ENV as NodeEnv;
if (envName === 'production') {
  path = `${__dirname}/../../../.env.production`;
} else {
  path = `${__dirname}/../../.env.${envName}`;
}

dotenv.config({ path });

const environment: { [_ in NodeEnv]: Environment } = {
  development: {
    baseClientUrl: 'http://localhost:3000',
    clientUrls: ['http://localhost:3000'],
    rateLimits: [
      {
        maxRequests: 5,
        timeWindow: 1000, // 1 Second
      },
      {
        maxRequests: 60,
        timeWindow: 1000 * 60, // 1 Minute
      },
    ],
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiryTime: 60 * 60 * 24 * 365, // 1 Year
      secure: false,
    },
  },
  production: {
    baseClientUrl: 'http://3.16.27.120:8080',
    clientUrls: [],
    rateLimits: [
      {
        maxRequests: 3,
        timeWindow: 1000, // 1 Second
      },
      {
        maxRequests: 20,
        timeWindow: 1000 * 60, // 1 Minute
      },
    ],
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiryTime: 60 * 60 * 24 * 7, // 7 Days
      secure: false,
    },
    mailer: {
      apiKey: process.env.MAILER_API_KEY!,
      username: process.env.MAILER_USERNAME!,
      resetPasswordTemplateId: 'd-803b3420888a4b16be882f3231efbc65',
    },
  },
  test: {
    baseClientUrl: '',
    clientUrls: [],
    rateLimits: [
      {
        maxRequests: Number.MAX_SAFE_INTEGER,
        timeWindow: 1000, // 1 Second
      },
    ],
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiryTime: 60 * 60 * 24 * 365, // 1 Year
      secure: false,
    },
  },
};

export default environment[envName];
