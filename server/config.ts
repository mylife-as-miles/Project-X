export function vertexConfig(env: NodeJS.ProcessEnv = process.env) {
  const project = (env.GOOGLE_CLOUD_PROJECT || env.GCS_PROJECT_ID || '').trim();
  return { configured: Boolean(project), project, location: env.GOOGLE_CLOUD_LOCATION || 'us-central1' };
}
