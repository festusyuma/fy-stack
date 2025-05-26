export function stripTrailingSlash(path: string) {
  return path.replace(/\/$/, '')
}