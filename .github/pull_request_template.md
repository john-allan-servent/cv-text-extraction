<!--
This template deliberately omits a "checks passed" checkbox. Required status
checks are enforced mechanically by the branch ruleset, and a box that cannot
be false teaches people to tick without reading.

Review approval is a separate matter. The ruleset may or may not require an
approving review — on a repo where you are usually the only author, it often
cannot, since GitHub will not let you approve your own PR. Where that is the
case, the Verification section below is doing the work a second reviewer would
otherwise do. Write it for someone who has not seen the diff.

If this repo has no branch ruleset at all, set one up before relying on this
template. The ruleset guidance is maintained centrally, not in this repo:
https://github.com/ServentLtd/copilot-templates/tree/main/branch-rulesets

Delete any section below that genuinely does not apply. Do not delete a section
because it is inconvenient to answer.
-->

## What

<!-- One paragraph: what this change does, in plain language. -->

## Why

<!-- The motivation, the problem being solved, or the decision this implements. -->

Closes #

## Verification

<!--
How *you* checked this works — commands run, tests added, manual steps taken,
environments touched. "CI is green" is not verification; it is the floor.

Where no second reviewer is required, this section is the only human check on
the change. Be specific enough that a reader could repeat it.
-->

- [ ] Required status checks are enforced on the target branch <!-- no-op where a ruleset exists; if not, see ServentLtd/copilot-templates -->

## Risk & rollback

<!-- Blast radius if this is wrong, and how to undo it. -->

## Breaking changes

None.

<!--
Otherwise: API, schema, config, contract or behaviour changes, and what
consumers must do. Note anything requiring a migration or coordinated deploy.
-->
