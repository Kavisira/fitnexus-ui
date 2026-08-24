// API base URL for the NestJS backend. Hardcoded for now rather than
// using Angular's build-time environment-file system, to keep the setup
// simple while there's only one target (local dev). Swap this for a
// proper environment.ts / environment.prod.ts pair before deploying.
export const API_BASE_URL = 'http://localhost:3000/api';
