// API base URL for the NestJS backend — comes from src/environments, which
// angular.json's `fileReplacements` swaps between environment.ts (local dev,
// http://localhost:3000/api) and environment.prod.ts (the deployed Render
// URL) depending on build configuration. Update environment.prod.ts with
// the real Render URL once you have it; no other file needs to change.
import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;
