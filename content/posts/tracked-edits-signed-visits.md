---
title: Signed means signed: tracked edits for clinical records
date: 2026-10-30
summary: Clinicians wanted to correct a signed visit note, and a signed note has to stay exactly as it was signed. Full versions, a reason for every change and a 409 for stale edits let both be true.
tags: Health tech, Data modeling, Backend
source: Retain Health · clinician portal server
---

A signed visit note in a clinical record is a statement: on this day, this clinician wrote this. If it can change silently afterwards, it stops being worth anything.

But clinicians make mistakes and find them later, and the tool has to let them fix them. The portal first handled that with addenda: a signed note stayed frozen and corrections were appended underneath. That keeps the original safe, but the note a colleague opens is never the note as it now stands. They have to read the corrections underneath and put it together themselves.

So we replaced addenda with tracked edits. This is the model, and the two small decisions that made it hold up.

## Every edit is a full new version

`POST /visits/:id/amendments` takes the new text and a reason. It never updates the note in place. It inserts a new, complete version under the editor's name, with the reason and the time, and the signed original stays exactly where it was.

```ts
// Simplified
async function amend(visitId: string, editor: User, body: { text: string; reason: string; baseVersion: number }) {
  return db.transaction(async (tx) => {
    const latest = await tx.latestVersion(visitId, { forUpdate: true })
    if (latest.number !== body.baseVersion) throw new HttpError(409, 'stale')
    return tx.insertVersion({
      visitId,
      number: latest.number + 1,
      text: body.text,
      reason: body.reason,
      authorUserId: editor.id,
    })
  })
}
```

Storing whole versions rather than diffs keeps every read simple: the current note is the newest row, and the note as signed is the first. Diffs are worked out when someone asks to see one, which is rarely, from data that cannot drift.

## A stale edit is refused, not merged

The `baseVersion` check is optimistic concurrency, and in a clinical record it is not optional. If two clinicians open the same note and both amend it, the second save was written against text that no longer exists. Merging it silently could undo the first person's correction without either of them knowing.

So the server answers `409 stale`, which lets the portal show the newer version so the clinician can make their change again on top of it. It is a little friction, at exactly the moment friction is worth it.

## History that reads like what people did

Version history for the whole patient report, not just visits, came in the same round of work, and it had to come from two places. Notes live in an append-only table, so their versions already existed and only needed diffing field by field. Everything stored elsewhere (corrections to patient responses, media, routines, publishing, assignment) was already in the [audit trail](/blog/audit-dont-block).

Two details made it readable:

- **Edit sessions.** The portal autosaves at every pause in typing, so one sitting can write dozens of versions. Versions by the same author less than 15 minutes apart are shown as one entry.
- **Bounded reads.** At most 100 sessions per note type and 400 audit rows. Note bodies are only fetched for the versions a diff actually needs, scoped to the patient, rather than loading every body to find the few that changed.

## The author is not always the clinician of record

The notes table had a `clinicianId`, a foreign key to the clinician assigned to the patient. That had quietly been doing two jobs: "whose patient is this" and "who wrote this". Once co-clinicians and administrators could edit, those were often different people.

So versions now record `authorUserId`, the signed-in user, separately from `clinicianId`. The old five-argument `write()` still works, so nothing that called it had to change on the same day.

## History is not audit

One last line we drew: the history endpoint returns the previous text of notes, so it is a portal route only, and nothing from it is written to the audit log. The log records that someone viewed a report's history. It does not become a second copy of what the history contains.

Tracked edits look like a small feature on screen. The model under them is what lets a clinician correct a signed record and still put their name to it.
