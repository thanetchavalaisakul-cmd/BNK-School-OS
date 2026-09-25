# QA — v5.10.1 Budget Acceptance Committee Cross-Department

## Database
- Production migration applied successfully.
- `set_budget_signer_assignments` no longer contains the same-department inspector guard.
- Requester conflict guard remains enforced server-side.
- Duplicate inspector guard remains enforced server-side.
- PA-only evaluator accounts are rejected server-side.
- Added nullable snapshot fields:
  - `signer_department_code`
  - `signer_department_name`
- Existing signer rows remain unchanged.
- Security Advisor: no new relevant findings.
- Performance Advisor: no new relevant findings.

## Frontend
- Inspector list no longer filters by requester department.
- Requester is excluded from inspector options.
- `pa_evaluator` accounts are excluded.
- Option labels show name, position, and department.
- UI copy states that cross-department selection is allowed.
- Duplicate and requester conflict checks also run before RPC call.
- JavaScript syntax checked with `node --check`.
