---
applyTo: "**"
description: "Best-practice GitHub branch and tag protection rulesets, plus repository merge hygiene settings (delete_branch_on_merge)."
---

# GitHub Branch & Tag Ruleset Standards

Use these instructions whenever asked to protect branches, protect tags, harden a
repository, configure rulesets, or apply "repo governance" to a GitHub repository.

## Principles

1. **Use rulesets, not legacy branch protection.** Rulesets are layerable, auditable,
   support tags as well as branches, and can be evaluated before enforcement.
2. **Enforcement must be `active`.** `evaluate` (dry-run) and `disabled` provide no
   protection. Only use `evaluate` if the user explicitly asks to trial a ruleset first.
3. **Keep bypass actors empty by default.** Every bypass actor is a hole in the control.
   Add one only when the user asks, and state who it is and why in your summary.
4. **Never invent status check contexts.** Derive them from the repository's real CI.
5. **Be idempotent.** List existing rulesets first; update by ID rather than creating
   duplicates with the same name.
6. **Always verify.** Re-read the ruleset and repository settings after writing them.

## Prerequisites

- Admin permission on the target repository.
- A token with the `repo` scope (`gh auth status` should show `admin:repo_hook`/`repo`).
- Know the `{owner}/{repo}` slug — derive it from `gh repo view --json nameWithOwner`
  rather than guessing.

---

## Ruleset 1 — Branch protection

**Name:** `branch-protection`
**Target:** the default branch (extend to release branches when the repo uses them)
**Enforcement:** `active`

| Rule                         | Rule type                | Why                                                        |
| ---------------------------- | ------------------------ | ---------------------------------------------------------- |
| Restrict deletions           | `deletion`               | Prevents accidental branch loss                             |
| Block force pushes           | `non_fast_forward`       | Preserves history and the audit trail                       |
| Require a pull request       | `pull_request`           | All changes are reviewed before landing                     |
| Dismiss stale approvals      | `dismiss_stale_reviews_on_push` | New commits invalidate prior approvals             |
| Require conversation resolution | `required_review_thread_resolution` | No unresolved review feedback is merged  |
| Require status checks        | `required_status_checks` | CI must pass — **only if the repo has CI** (see below)      |
| Require linear history       | `required_linear_history`| Clean, bisectable history; pairs with squash-only merges    |

### Targeting

```json
{
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  }
}
```

Use `"~ALL"` only if the user wants every branch protected. For long-lived release
branches, extend the include list, e.g.
`["~DEFAULT_BRANCH", "refs/heads/release/*", "refs/heads/main"]`.

### Status checks — conditional rule

Before adding `required_status_checks`:

1. Inspect `.github/workflows/*.yml` and `*.yaml`.
2. Derive contexts from each job's `name:` (or the job key when `name:` is absent).
   For a matrix job, the context includes the matrix values, e.g. `build (ubuntu-latest)`.
3. Only require checks that run on `pull_request` events — a check that never runs on
   a PR will block merges forever.
4. If the repository has **no** CI workflows, **omit this rule entirely** and say so in
   your summary. Do not fabricate contexts such as `build` or `ci`.

Set `strict_required_status_checks_policy: true` so branches must be up to date with the
target branch before merging.

### Full REST payload

```json
{
  "name": "branch-protection",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "required_review_thread_resolution": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "build" },
          { "context": "test" }
        ]
      }
    },
    { "type": "required_linear_history" }
  ]
}
```

Optional hardening to offer the user:

- `require_code_owner_review: true` when a `CODEOWNERS` file exists.
- `require_last_push_approval: true` so the person who pushed last cannot self-approve.
- `required_approving_review_count: 2` for regulated or high-blast-radius repositories.
- A `required_signatures` rule when the team already signs commits.

### Apply with `gh`

```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/{owner}/{repo}/rulesets" \
  --input branch-protection.json
```

Or inline, without a temporary file:

```bash
cat <<'JSON' | gh api --method POST -H "Accept: application/vnd.github+json" "/repos/{owner}/{repo}/rulesets" --input -
{ "name": "branch-protection", "target": "branch", "enforcement": "active", "...": "..." }
JSON
```

On Windows PowerShell, use a here-string instead of a heredoc:

```powershell
@'
{ "name": "branch-protection", "target": "branch", "enforcement": "active" }
'@ | gh api --method POST -H "Accept: application/vnd.github+json" "/repos/{owner}/{repo}/rulesets" --input -
```

---

## Ruleset 2 — Tag protection

**Name:** `tag-protection`
**Target:** tags matching `v*`
**Enforcement:** `active`

Release tags are immutable evidence of what was shipped. They must not be deleted,
force-moved, or re-pointed after publication.

| Rule                | Rule type          | Why                                          |
| ------------------- | ------------------ | -------------------------------------------- |
| Restrict deletions  | `deletion`         | A published release tag can never disappear  |
| Block force pushes  | `non_fast_forward` | The tag cannot be force-moved                |
| Restrict updates    | `update`           | The tag cannot be re-pointed at another commit |

### Full REST payload

```json
{
  "name": "tag-protection",
  "target": "tag",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["refs/tags/v*"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "update" }
  ]
}
```

> `refs/tags/v*` matches `v1.0.0`, `v2.1.0-rc.1`, and so on. Add
> `"refs/tags/[0-9]*"` only if the repository also publishes unprefixed version tags.

### Apply with `gh`

```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/{owner}/{repo}/rulesets" \
  --input tag-protection.json
```

---

## Repository settings

Rulesets do not cover merge hygiene. Set these alongside the rulesets.

| Setting                            | Value   | Why                                                  |
| ---------------------------------- | ------- | ---------------------------------------------------- |
| `delete_branch_on_merge`           | `true`  | Automatically delete head branches after merge        |
| `allow_squash_merge`               | `true`  | Squash-only is what makes linear history workable     |
| `allow_merge_commit`               | `false` | Merge commits break `required_linear_history`         |
| `allow_rebase_merge`               | `false` | Keep a single, predictable merge strategy             |
| `allow_auto_merge`                 | `true`  | Merge automatically once checks and reviews pass      |

### Apply with `gh`

```bash
gh repo edit {owner}/{repo} \
  --delete-branch-on-merge \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --enable-auto-merge
```

### Apply with REST

```bash
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  "/repos/{owner}/{repo}" \
  -F delete_branch_on_merge=true \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F allow_auto_merge=true
```

Equivalent JSON body:

```json
{
  "delete_branch_on_merge": true,
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "allow_auto_merge": true
}
```

---

## Idempotency — create vs. update

Always list first:

```bash
gh api "/repos/{owner}/{repo}/rulesets" --jq '.[] | {id, name, target, enforcement}'
```

- If a ruleset with the target name **does not** exist → `POST /repos/{owner}/{repo}/rulesets`.
- If it **does** exist → `PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}` with the full
  desired payload. `PUT` replaces the ruleset, so send every rule you want to keep.

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/{owner}/{repo}/rulesets/{ruleset_id}" \
  --input branch-protection.json
```

## Verification

```bash
# Both rulesets present and active
gh api "/repos/{owner}/{repo}/rulesets" --jq '.[] | "\(.name)\t\(.target)\t\(.enforcement)"'

# Full rule list for one ruleset
gh api "/repos/{owner}/{repo}/rulesets/{ruleset_id}" --jq '.rules[].type'

# Rules actually in effect on the default branch (includes org-level rulesets)
gh api "/repos/{owner}/{repo}/rules/branches/main" --jq '.[].type'

# Repository merge settings
gh repo view {owner}/{repo} --json deleteBranchOnMerge,squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed
```

Expected: `branch-protection` and `tag-protection`, both `active`; the branch ruleset
lists `deletion`, `non_fast_forward`, `pull_request`, `required_linear_history` (plus
`required_status_checks` where CI exists); the tag ruleset lists `deletion`,
`non_fast_forward`, `update`; `deleteBranchOnMerge` is `true`.

---

## Agent workflow

1. Resolve `{owner}/{repo}` and the default branch name via `gh repo view`.
2. Enumerate `.github/workflows/` and derive PR-triggered status check contexts.
3. Read existing rulesets and repository settings — report the current state before changing it.
4. Confirm with the user any value you had to assume: approval count, bypass actors,
   extra branch patterns, tag patterns, status check contexts.
5. Apply ruleset 1 (branch protection).
6. Apply ruleset 2 (tag protection).
7. Apply the repository settings, including `delete_branch_on_merge`.
8. Verify with the commands above.
9. Summarise: what was created, what was updated, what was skipped and why.

## Guardrails

- **Never** delete or disable an existing ruleset without explicit confirmation.
- **Never** add bypass actors silently; always name them in your summary.
- **Never** require a status check that does not run on `pull_request` — it will
  permanently block merges.
- Organisation-level rulesets may already apply. Check
  `GET /repos/{owner}/{repo}/rules/branches/{branch}` and do not duplicate or attempt to
  weaken them; org rules always win.
- Enabling `required_linear_history` while `allow_merge_commit` is `true` produces
  unmergeable pull requests — always change both together.
- A `404` from the rulesets endpoint usually means insufficient permission, not a
  missing repository. Check `gh auth status` before retrying.
