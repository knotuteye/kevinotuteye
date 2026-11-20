---
title: Audit the action instead of blocking it
date: 2026-09-22
summary: We replaced role-based guardrails in a clinical portal with one middleware that records every request. It was a better security model for a care team, and it went on to power version history and our alarms.
tags: Health tech, Security, Backend
source: Retain Health · clinician portal server
---

The clinician portal at Retain Health started with the access rules you would expect: a clinician could see the patients assigned to them, administrators could see more, and every route checked the caller's role and assignment before doing anything.

In practice, care is done by a team. A colleague covers while someone is away. A second clinician works an order alongside the first. An administrator fixes a report at the end of the day. Every one of those is legitimate, and a rule built around one assigned clinician says no to all of them. Rules that block legitimate work get worked around, and a workaround leaves no record.

So we changed the model. Every portal role can now see every patient and take every portal action, and every request is written to an append-only audit table. The question stopped being "is this person allowed?" and became "can we always say exactly who did what?" The HIPAA Security Rule asks for exactly that kind of control: mechanisms that record and examine activity in systems that hold patient data.

This is how the audit trail works, and what else it turned out to be good for.

## One middleware, mounted first

The trail is a single Express middleware mounted ahead of every clinician-portal router, so a new route is audited without anyone remembering to do it. It writes one row per request: who made it, their role, the action, method and path, the response status, the patient, the resource, IP address, user agent and how long it took.

The row is written when the response finishes, so it knows the status code and the duration:

```ts
// Simplified
export function auditTrail(req, res, next) {
  const started = performance.now()
  const entry = { actor: req.user.id, role: req.user.role, method: req.method, path: req.route?.path }
  req.audit = (more) => Object.assign(entry, more) // handlers add context

  let written = false
  const write = (aborted: boolean) => {
    if (written) return
    written = true
    record({ ...entry, status: res.statusCode, ms: performance.now() - started, aborted })
  }
  res.on('finish', () => write(false))
  res.on('close', () => write(!res.writableFinished)) // tab closed mid-PDF
  next()
}
```

The `close` handler matters more than it looks. A clinician who closes the tab while a PDF is streaming never gets a `finish` event, and without it, the request that read a patient's report would simply not exist in the log. Those rows are kept, with `aborted` set to true.

## Context without copying patient data

Handlers call `annotateAudit()` to say which patient and resource a request was about, and, for changes like order assignment or status, the values before and after.

The rule for that `details` field is strict: it holds only IDs and changed values. It never holds note text, report content or file bytes. An audit log that copies clinical text is a second copy of patient data with weaker access controls, and you have built yourself a new problem. For media, for example, a description change is recorded by its length only, because the description itself is PHI.

## Working out "was this their patient?" at write time

Removing the guardrail did not mean forgetting about assignment. Every row carries `actorWasAssigned`: true when the clinician was assigned to the patient at the moment of the request, false when they were not, and NULL when the request was not about one patient.

It is computed inside the INSERT, so it reflects assignment at that instant and costs no extra round trip:

```sql
-- Simplified
INSERT INTO clinicianPortalAuditLog (actorUserId, patientId, action, actorWasAssigned, ...)
SELECT ?, ?, ?,
  CASE WHEN ? IS NULL THEN NULL
       ELSE EXISTS (SELECT 1 FROM orders o
                     WHERE o.patientId = ? AND o.clinicianId = ?)
  END,
  ...
```

Reviewing "who opened records of patients who were not theirs this month" is now one query on one table. When we later added co-clinicians to orders, only this subquery had to learn about them.

## The log must never take the portal down

An audit table that is slow or unreachable must not stop a clinician from working. If a write fails, the full entry goes to CloudWatch Logs, where it can still be recovered, and the response is released after at most three seconds. It is a trade-off and we made it on purpose: a delayed record that still exists somewhere is better than a portal that stops while a patient is waiting.

Reading the log has its own endpoint, filterable by patient, actor, action and date, with cursor paging. Reading the log is itself audited.

## What else it paid for

The trail turned out to be infrastructure, not just compliance:

- **Version history.** When clinicians asked to see every change to a report, half of the history was already in the audit table: patient-response corrections, media, routines, publishing, assignment. The other half came from an append-only notes table.
- **Alarms.** The same middleware writes CloudWatch Embedded Metric Format lines as it logs, which gave us 5xx and p95-latency alarms for the whole portal without touching a single route.
- **Notifications.** The clinician notification bell is built from the status history and co-clinician tables that the audited routes write, so it needed no new table.

Guardrails answer one question at one moment. A good audit trail keeps answering questions you have not thought of yet.
