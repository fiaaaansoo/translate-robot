const API_URL = 'https://api.github.com';

export interface OpenPullRequestParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

export interface GitHubClient {
  openPullRequest(params: OpenPullRequestParams): Promise<{ url: string }>;
}

export interface GitHubClientOptions {
  /** Defaults to the GITHUB_TOKEN environment variable. */
  token?: string;
  /** Injectable for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * A GitHubClient backed by the GitHub REST API. The token is read from an
 * environment variable (or injected explicitly for testing) - never
 * hardcoded, never included in any error message this module throws.
 *
 * Deliberately has no merge or approve method - opening a PR is the only
 * thing this module ever does to a pull request (cf. the safety-guard
 * test under tests/pr/); a PR it opens is always left for a human to
 * review and merge.
 */
export function createGitHubClient(options: GitHubClientOptions = {}): GitHubClient {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!token) {
    throw new Error(
      'createGitHubClient: no GitHub token configured. Set GITHUB_TOKEN or pass { token }.',
    );
  }

  return {
    async openPullRequest(params: OpenPullRequestParams): Promise<{ url: string }> {
      const response = await fetchImpl(`${API_URL}/repos/${params.owner}/${params.repo}/pulls`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          head: params.head,
          base: params.base,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `createGitHubClient: opening the pull request failed with status ${response.status}`,
        );
      }

      const body = (await response.json()) as { html_url?: string };
      if (!body.html_url) {
        throw new Error('createGitHubClient: response contained no html_url');
      }
      return { url: body.html_url };
    },
  };
}
