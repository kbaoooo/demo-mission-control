# Commit Message Agent Rules

Agents must use Conventional Commits for every commit in this project.

## Format

```txt
<type>: <summary>
```

Optional scope is allowed when it adds clarity:

```txt
<type>(<scope>): <summary>
```

## Allowed Types

- `feat`: user-facing feature or new capability
- `fix`: bug fix
- `docs`: documentation-only change
- `style`: formatting or visual-only code style change with no behavior change
- `refactor`: code restructuring with no behavior change
- `perf`: performance improvement
- `test`: tests only
- `build`: build system, dependency, bundler, or package changes
- `ci`: CI configuration
- `chore`: maintenance that does not fit another type
- `revert`: revert a previous commit

Use `chore`, not `chores`.

## Summary Rules

- Use lowercase type.
- Use imperative mood when possible.
- Keep the summary concise, ideally 72 characters or fewer.
- Do not end the summary with a period.
- Mention the real behavior changed, not vague activity.

Good examples:

```txt
feat: add satellite mission dashboard
fix: split ground track at antimeridian
docs: document SatNOGS TLE response fields
build: add satellite propagation dependencies
chore: update agent commit rules
```

Bad examples:

```txt
update files
feat added stuff
chores: cleanup
fix: fixed bug.
```

## Body

Add a body only when the commit needs context, tradeoffs, migration notes, or test evidence.

```txt
feat: add satellite mission dashboard

Fetches the latest SatNOGS TLE, propagates it with SGP4, and renders current
position, footprint, ground track, and Hanoi pass predictions.

Verified with npm run build and npm run lint.
```

## When The User Says Commit

Before committing:

1. Run `git status --short`.
2. Review the scoped diff.
3. Stage only relevant files.
4. Use a Conventional Commit message.
5. If verification was run, mention it in the commit body or final response.
