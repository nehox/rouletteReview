const GITHUB_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

export function normalizeRepoUrl(input: string): string | null {
  const match = input.trim().match(GITHUB_URL_PATTERN);
  if (!match) return null;
  const [, owner, repo] = match;
  if (!owner || !repo || repo === "." || repo === "..") return null;
  return `https://github.com/${owner}/${repo}`;
}

export function isValidRepoUrl(input: string): boolean {
  return normalizeRepoUrl(input) !== null;
}
