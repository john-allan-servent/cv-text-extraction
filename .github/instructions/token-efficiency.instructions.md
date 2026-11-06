# Token Efficiency Policy

OBJECTIVE: Maximum one-shot correctness per token consumed. Input-context
discipline first, output brevity second.

## 1. Context Acquisition (largest cost — optimize hardest)

- Read a file **once**. Never re-read a file you have already viewed or edited
  unless an external process (build, codegen, another agent) changed it.
- Never `view` a whole file when a range will do. Use `grep -n` to locate the
  symbol, then `view` ±40 lines around the hit.
- Search precedence: LSP (`goToDefinition`, `findReferences`, `documentSymbol`)
    > `glob` > `grep` scoped by `glob`/`type` > shell. Never `grep` the repo root
    > without a path or glob filter.
- Use `output_mode: "files_with_matches"` or `"count"` first; escalate to
  `"content"` only for the files that matter.
- Never read generated or vendored paths: `node_modules/`, `dist/`, `bin/`,
  `obj/`, `.angular/`, `package-lock.json`, `*.min.*`, `*.designer.cs`,
  snapshots, migrations.
- Stop searching when you have enough to act. Confirmation-seeking greps after a
  conclusive result are pure waste.

## 2. Tool-Call Economy

- Batch all independent reads/searches into a single response. Sequential calls
  are permitted only when the next call's arguments depend on the prior result.
- Budget: aim to reach the first edit within ~5 tool calls for a localized
  change. If you exceed ~15 exploration calls, stop and state the ambiguity
  instead of continuing to search.
- Truncate every command's output at the source, not in your head:
  `--quiet`, `--no-pager`, `-tl`, `| Select-Object -First 40`,
  `2>&1 | Select-String -Pattern 'error|warning'`.
- Prefer targeted verification: `dotnet test --filter "FullyQualifiedName~X"`,
  `ng test --include="**/x.spec.ts"`. Full-suite runs only when the change is
  cross-cutting or targeted runs pass and you need a final gate.
- Delegate to a sub-agent only when the work needs its own large context window
  (broad multi-subsystem exploration). Sub-agents cost a full extra context —
  never use one for work you could finish in ≤5 direct calls.

## 3. Editing

- Edit with minimal anchored `old_str`/`new_str` pairs. Never rewrite a file to
  change a few lines; never `create` over an existing file.
- Batch multiple edits to the same file in one response.
- Do not echo edited code back in your reply. The diff is already visible to the
  user — restating it doubles the cost of every change.
- Do not re-view a file to "confirm" an edit that applied successfully.

## 4. Reasoning Budget

- Match effort to risk. Trivial, reversible, single-file changes: act directly.
  Reserve extended deliberation for irreversible, cross-cutting, or
  security-relevant work.
- Do not enumerate alternatives you have already rejected.
- Do not restate the plan after executing it.

## 5. Output

- No prologues, epilogues, greetings, or transition phrases ("Let me…",
  "Now I'll…", "Great!").
- No summary of what the user can already see in the diff or terminal output.
- Scale the final reply to the size of the change, not a fixed cap. Small,
  localized change: ≤4 bullets, ≤12 words each — what changed, and anything
  that needs a decision. Large or multi-file refactor: group bullets by
  file/module/theme, one line per group, so the user gets a genuine map of
  what moved without re-reading every diff. Still omit files that did not
  change and skip narrating obvious mechanical edits.
- Surface risks, assumptions, and failures always — brevity never justifies
  hiding a problem or claiming unverified success.
- No unrequested markdown files, plans, or summary docs.

## 6. Non-Negotiable (efficiency never overrides these)

- Verify behavior before declaring done. A cheap wrong answer costs more than an
  expensive right one — the retry loop pays the full context cost again.
- Never skip a needed read to save tokens. Guessing at file contents is the most
  expensive failure mode there is.
