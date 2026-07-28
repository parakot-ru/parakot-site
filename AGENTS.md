# Parakot Site Agent Entry Point

This is a code repository managed by the long-lived Codex control project:

`~/Documents/Codex/projects/parakot`

## Before Any Work

1. Resolve the control project path for the current host.
2. Read these control files in order:
   - `AGENTS.md`
   - `PROJECT.md`
   - `STATUS.md`
   - `RESOURCES.md`
   - `HANDOFF.md`
3. Check `STATUS.md` for the active operator. If another host is active, default
   to read-only diagnostics until ownership is explicitly transferred.
4. Return to this repository and read its `README.md` when present, relevant
   files in `docs/`, and the source files required for the task.

If the control project is unavailable, do not recreate it or guess its state.
Report that the control context is unavailable and continue only with safe,
repository-local work.

## Knowledge Boundaries

- Cross-repository status, decisions, ownership, deployment context, and
  handoffs belong in the control project.
- Code-specific implementation notes and documentation belong in this
  repository.
- `RESOURCES.md` in the control project is the canonical map between this
  repository and external services, domains, deployments, and other repos.
- Shared memory is a routing aid, not a replacement for the live repository and
  control files.
- Never copy secrets, tokens, passwords, cookies, private keys, or `.env`
  contents into Git or shared memory.

## After Meaningful Changes

- Update the control project's `STATUS.md`, `HANDOFF.md`, `RESOURCES.md`, or
  `DECISIONS.md` when paths, ownership, remotes, deployment state, interfaces,
  or cross-repository decisions changed.
- Keep commits for this code repository and the control repository separate.
- Before a device or operator handoff, commit and push the required context in
  both repositories.
