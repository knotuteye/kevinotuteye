---
title: Let the machine draft. Never let it overwrite a clinician.
date: 2026-11-05
summary: Adding automatic Patient Summary drafts to a clinical portal took one HTTP call and four rules about where the draft lives, how long it takes and who wins when it disagrees with a person.
tags: AI, Health tech, AWS
source: Retain Health · clinician portal
---

A Patient Summary at Retain Health is the document a patient takes home after their brain-health results come back: what the labs found, what it means, and what to do next. A clinician writes it from a lab report and a set of biomarker results, and it takes real time to write well.

This autumn we gave the clinician portal a way to draft most of it automatically. Once a patient has both a lab report and a completed lab order, the server can ask a separate automation service to fill in the opening overview and the brain-health sections. The clinician reviews, rewrites what they want and publishes.

The call to the drafting service was the easy part. What took the work were four rules about everything around it. None of them depends on what does the drafting, which is the point: they are the same rules I would want for a large language model.

## 1. A draft takes longer than a request is allowed to

The service takes between 10 and 60 seconds. API Gateway gives up on a request well before the slow end of that range, so the obvious design, where the portal calls the server and the server calls the service, would fail exactly when the draft is worth having.

So drafting is a job, not a request:

```ts
// POST /patients/:id/report/summary/draft (simplified)
router.post('/patients/:id/report/summary/draft', async (req, res) => {
  if (!drafting.configured()) return res.status(503).json({ error: 'not_configured' })
  await audit(req, 'patientSummaryDraft')
  await queue.send({ patientId: req.params.id, requestedBy: req.user.id })
  res.status(202).json({ status: 'queued' })
})
```

The endpoint puts the job on an SQS queue (with a dead-letter queue behind it) and answers `202 Accepted` at once. A dedicated Lambda picks the job up and makes the slow call. The portal polls `GET .../summary/draft` until the result is there. On a developer's laptop there is no queue, so the same job runs in-process and the code path stays one path.

The 202-and-poll shape is old and boring, and that is why I like it here: a clinician can close the tab, come back later, and the draft is still being made.

## 2. The draft lives somewhere autosave cannot reach

The portal autosaves a clinician's notes at every pause in typing. If the draft were written into the notes, a tab left open since before the draft arrived would autosave its older copy over it a few seconds later. Nobody would see it happen.

So the draft is a JSON object in S3, stored next to the published PDF and never in the notes. The autosave cannot erase what it never holds. And if a redraft fails, the previous draft stays where it was: a failed request should never leave a clinician with less than they had.

## 3. A person always outranks the machine

Each section of the summary could come from three places: what the clinician wrote, what the draft says, and the clinician's Insights notes, which had fed the summary before drafts existed. The order between them is fixed and lives in one place:

```ts
// One function decides; every screen and the PDF use it.
function sectionText(section: SectionId, sources: Sources): string {
  return (
    sources.clinicianEdits[section] ?? // a person wrote it: final
    sources.draft?.[section] ?? // the machine suggested it
    sources.insightsNotes[section] ?? // what fed the summary before
    ''
  )
}
```

Two consequences follow, and both are deliberate. A redraft never overwrites text a clinician has written, even if the new draft is better. And draft text only ever appears in a section no person has touched, so it is always a starting point, never a correction.

A week later we stopped filling the summary from Insights notes at all. Because the order lived in one function, that was a one-line change.

## 4. Off until it is allowed to be on

A drafting service that sees patient data has to run somewhere covered by a Business Associate Agreement. Until it was, the feature had to be impossible to switch on by accident in production.

So the service URL is configuration, set on the development environment only and left empty on staging and production until the service runs under a BAA. Without a URL or an API key, the endpoint does not throw: drafting reports itself as not configured. Requesting a draft is also written to the audit trail, so we can always say who asked for machine text on which patient, and when.

## What this means for AI in clinical software

The service behind this endpoint is an internal one, not a hosted model. But swap it for an LLM and not one of these rules changes:

- slow generation belongs in a job with a retry and a dead-letter queue, not in a request;
- generated text lives apart from human text, so no background save can confuse the two;
- a person's words always win, and generated text looks like a suggestion until a person accepts it;
- the feature is switched off by configuration until the data agreements say it can be on, and every use is audited.

The model is the least interesting part of putting AI in front of clinicians. The interesting part is everything that lets a clinician trust it and ignore it in the same afternoon.
