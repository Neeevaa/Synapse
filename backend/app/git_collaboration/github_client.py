import logging
import httpx
from app.common.exceptions import BaseBusinessException

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
GITHUB_API_VERSION = "2022-11-28"
REQUEST_TIMEOUT_SECONDS = 10.0


def _get_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token.strip()}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "Synapse-AI-Platform/1.0",
    }


def _handle_github_error(response: httpx.Response, action_description: str) -> None:
    status = response.status_code
    error_msg = f"GitHub API error during {action_description}."

    try:
        data = response.json()
        remote_msg = data.get("message")
        if remote_msg:
            error_msg = f"GitHub: {remote_msg}"
    except Exception:
        pass

    if status == 401:
        raise BaseBusinessException("Invalid or expired GitHub Personal Access Token. Please verify your token.", status_code=401)
    if status == 403 or status == 429:
        remaining = response.headers.get("x-ratelimit-remaining")
        if remaining == "0":
            raise BaseBusinessException("GitHub API rate limit exceeded. Please try again later.", status_code=429)
        raise BaseBusinessException(f"GitHub access forbidden or insufficient permissions. {error_msg}", status_code=403)
    if status == 404:
        raise BaseBusinessException("Requested GitHub resource or repository was not found or your token lacks access.", status_code=404)

    raise BaseBusinessException(f"GitHub API request failed with status {status}. {error_msg}", status_code=502)


def validate_pat_and_get_user(token: str) -> dict:
    """
    Validates the PAT against GitHub /user and retrieves identity.
    Never logs the token.
    """
    url = f"{GITHUB_API_BASE}/user"
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = client.get(url, headers=_get_headers(token))
    except httpx.TimeoutException:
        raise BaseBusinessException("GitHub connection timed out. Please try again.", status_code=504)
    except httpx.RequestError as exc:
        logger.error("Network error communicating with GitHub API: %s", type(exc).__name__)
        raise BaseBusinessException("Network error connecting to GitHub. Please check connection.", status_code=502)

    if resp.status_code != 200:
        _handle_github_error(resp, "token validation")

    data = resp.json()
    return {
        "username": data.get("login"),
        "user_id": str(data.get("id")),
        "avatar_url": data.get("avatar_url"),
        "name": data.get("name"),
    }


def verify_repo_access(token: str, owner: str, repo: str) -> dict:
    """
    Verifies that the PAT has at least read access to the target repository.
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = client.get(url, headers=_get_headers(token))
    except httpx.TimeoutException:
        raise BaseBusinessException("GitHub repository verification timed out.", status_code=504)
    except httpx.RequestError as exc:
        logger.error("Network error communicating with GitHub API: %s", type(exc).__name__)
        raise BaseBusinessException("Network error connecting to GitHub.", status_code=502)

    if resp.status_code != 200:
        _handle_github_error(resp, f"verifying access to {owner}/{repo}")

    data = resp.json()
    permissions = data.get("permissions", {})
    return {
        "full_name": data.get("full_name"),
        "private": data.get("private", False),
        "permissions": permissions,
        "default_branch": data.get("default_branch", "main"),
    }


def fetch_repo_commits(token: str, owner: str, repo: str, per_page: int = 20, page: int = 1) -> list[dict]:
    """
    Fetches real commits from the GitHub repository.
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits"
    params = {"per_page": min(max(per_page, 1), 50), "page": max(page, 1)}

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = client.get(url, headers=_get_headers(token), params=params)
    except httpx.TimeoutException:
        raise BaseBusinessException("GitHub commits fetch timed out.", status_code=504)
    except httpx.RequestError as exc:
        logger.error("Network error communicating with GitHub API: %s", type(exc).__name__)
        raise BaseBusinessException("Network error connecting to GitHub.", status_code=502)

    if resp.status_code != 200:
        _handle_github_error(resp, f"fetching commits for {owner}/{repo}")

    commits_data = resp.json()
    formatted = []
    for c in commits_data:
        commit_info = c.get("commit", {})
        author_info = commit_info.get("author", {})
        github_author = c.get("author") or {}

        formatted.append({
            "sha": c.get("sha"),
            "short_sha": (c.get("sha") or "")[:8],
            "message": commit_info.get("message", "").split("\n")[0],
            "author_name": author_info.get("name"),
            "author_avatar": github_author.get("avatar_url"),
            "date": author_info.get("date"),
            "html_url": c.get("html_url"),
        })
    return formatted


def fetch_repo_pull_requests(
    token: str,
    owner: str,
    repo: str,
    state: str = "all",
    per_page: int = 20,
    page: int = 1,
) -> list[dict]:
    """
    Fetches real pull requests from the GitHub repository.
    """
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls"
    params = {"state": state, "per_page": min(max(per_page, 1), 50), "page": max(page, 1)}

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            resp = client.get(url, headers=_get_headers(token), params=params)
    except httpx.TimeoutException:
        raise BaseBusinessException("GitHub pull requests fetch timed out.", status_code=504)
    except httpx.RequestError as exc:
        logger.error("Network error communicating with GitHub API: %s", type(exc).__name__)
        raise BaseBusinessException("Network error connecting to GitHub.", status_code=502)

    if resp.status_code != 200:
        _handle_github_error(resp, f"fetching pull requests for {owner}/{repo}")

    pulls_data = resp.json()
    formatted = []
    for pr in pulls_data:
        user_info = pr.get("user") or {}
        formatted.append({
            "number": pr.get("number"),
            "title": pr.get("title"),
            "state": pr.get("state"),
            "author_login": user_info.get("login"),
            "author_avatar": user_info.get("avatar_url"),
            "created_at": pr.get("created_at"),
            "html_url": pr.get("html_url"),
        })
    return formatted
