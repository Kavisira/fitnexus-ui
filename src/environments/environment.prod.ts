// Production config — swapped in for environment.ts by the `fileReplacements`
// entry in angular.json whenever the app is built with the `production`
// configuration (the default for `ng build`, and what Vercel runs).
//
// Replace the URL below with your actual Render backend URL once you have
// it (Render → your web service → the URL shown at the top of its page),
// then redeploy. Keep the `/api` suffix — the NestJS app sets a global
// `api` prefix in main.ts.
export const environment = {
  production: true,
  apiBaseUrl: 'https://fitnexus-api.onrender.com/api',
};
