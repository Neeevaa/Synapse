import re
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import GitReferenceType

GITHUB_REPO_REGEX = re.compile(r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/?$")
GITHUB_COMMIT_URL_REGEX = re.compile(r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/commit/([0-9a-fA-F]{7,64})/?$")
GITHUB_PR_URL_REGEX = re.compile(r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/pull/([0-9]+)/?$")
COMMIT_HASH_REGEX = re.compile(r"^[0-9a-fA-F]{7,64}$")


def normalize_github_repo_url(url: str) -> str:
    cleaned = url.strip()
    match = GITHUB_REPO_REGEX.match(cleaned)
    if not match:
        raise ValueError("Must be a valid HTTPS GitHub repository URL (e.g. https://github.com/owner/repository).")
    owner, repo = match.group(1), match.group(2)
    # Disallow reserved names or dotgit if desirable, but standard github paths are owner/repo
    if repo.endswith(".git"):
        repo = repo[:-4]
    return f"https://github.com/{owner}/{repo}"


def normalize_github_commit_url(url: str) -> str:
    cleaned = url.strip()
    match = GITHUB_COMMIT_URL_REGEX.match(cleaned)
    if not match:
        raise ValueError("Must be a valid HTTPS GitHub commit URL (e.g. https://github.com/owner/repo/commit/<hash>).")
    owner, repo, chash = match.group(1), match.group(2), match.group(3)
    if repo.endswith(".git"):
        repo = repo[:-4]
    return f"https://github.com/{owner}/{repo}/commit/{chash}"


def normalize_github_pr_url(url: str) -> str:
    cleaned = url.strip()
    match = GITHUB_PR_URL_REGEX.match(cleaned)
    if not match:
        raise ValueError("Must be a valid HTTPS GitHub pull request URL (e.g. https://github.com/owner/repo/pull/42).")
    owner, repo, pr_num = match.group(1), match.group(2), match.group(3)
    if repo.endswith(".git"):
        repo = repo[:-4]
    return f"https://github.com/{owner}/{repo}/pull/{pr_num}"


def validate_commit_hash_str(h: str) -> str:
    cleaned = h.strip()
    if not COMMIT_HASH_REGEX.match(cleaned):
        raise ValueError("Commit hash must be a hexadecimal string between 7 and 64 characters.")
    return cleaned


# --- Repository Schemas ---

class RepositoryRegisterRequest(BaseModel):
    repository_url: str = Field(..., max_length=500, description="HTTPS GitHub repository URL")
    repository_name: str | None = Field(None, max_length=255, description="Optional custom display name")

    @field_validator("repository_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        return normalize_github_repo_url(v)

    @field_validator("repository_name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None


class RepositoryUpdateRequest(BaseModel):
    repository_url: str | None = Field(None, max_length=500, description="Updated HTTPS GitHub repository URL")
    repository_name: str | None = Field(None, max_length=255, description="Updated display name")

    @field_validator("repository_url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            return normalize_github_repo_url(v)
        return None

    @field_validator("repository_name")
    @classmethod
    def clean_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None


class RepositoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    repository_url: str
    repository_name: str | None = None
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime


# --- Task Git Reference Schemas ---

class TaskGitReferenceCreateRequest(BaseModel):
    task_id: UUID
    reference_type: GitReferenceType
    commit_hash: str | None = Field(None, max_length=64)
    commit_url: str | None = Field(None, max_length=500)
    pull_request_url: str | None = Field(None, max_length=500)
    description: str | None = Field(None, max_length=500)

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None

    @model_validator(mode="after")
    def validate_conditional_fields(self):
        if self.reference_type == GitReferenceType.COMMIT:
            if not self.commit_hash:
                raise ValueError("Commit hash is required when reference type is Commit.")
            self.commit_hash = validate_commit_hash_str(self.commit_hash)
            if self.commit_url:
                self.commit_url = normalize_github_commit_url(self.commit_url)
                # Check consistency if possible: commit_url hash should match commit_hash
                url_hash = self.commit_url.split("/commit/")[-1]
                if not (url_hash.lower().startswith(self.commit_hash.lower()) or self.commit_hash.lower().startswith(url_hash.lower())):
                    raise ValueError(f"Commit URL hash ({url_hash[:8]}...) does not match commit hash ({self.commit_hash[:8]}...).")
            # Clear irrelevant fields
            self.pull_request_url = None
        elif self.reference_type == GitReferenceType.PULL_REQUEST:
            if not self.pull_request_url:
                raise ValueError("Pull Request URL is required when reference type is Pull Request.")
            self.pull_request_url = normalize_github_pr_url(self.pull_request_url)
            # Clear irrelevant fields
            self.commit_hash = None
            self.commit_url = None
        return self


class TaskGitReferenceUpdateRequest(BaseModel):
    reference_type: GitReferenceType | None = None
    commit_hash: str | None = Field(None, max_length=64)
    commit_url: str | None = Field(None, max_length=500)
    pull_request_url: str | None = Field(None, max_length=500)
    description: str | None = Field(None, max_length=500)

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None


class TaskGitReferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    task_id: UUID
    task_title: str
    task_status: str | None = None
    task_priority: str | None = None
    reference_type: GitReferenceType
    commit_hash: str | None = None
    commit_url: str | None = None
    pull_request_url: str | None = None
    description: str | None = None
    created_by: UUID | None = None
    creator_name: str | None = None
    created_at: datetime
    updated_at: datetime


# --- GitHub Connection Schemas ---

class GitHubConnectRequest(BaseModel):
    personal_access_token: str = Field(..., min_length=10, max_length=500, description="GitHub Personal Access Token")

    @field_validator("personal_access_token")
    @classmethod
    def validate_token_format(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Personal Access Token cannot be empty.")
        if any(c.isspace() for c in clean):
            raise ValueError("Token cannot contain spaces.")
        return clean


class GitHubConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    github_username: str
    github_user_id: str | None = None
    github_avatar_url: str | None = None
    token_type: str
    is_valid: bool
    last_tested_at: datetime | None = None
    connected_at: datetime


class GitHubCommitItemResponse(BaseModel):
    sha: str
    short_sha: str
    message: str
    author_name: str | None = None
    author_avatar: str | None = None
    date: str | None = None
    html_url: str


class GitHubPullRequestItemResponse(BaseModel):
    number: int
    title: str
    state: str
    author_login: str | None = None
    author_avatar: str | None = None
    created_at: str | None = None
    html_url: str
