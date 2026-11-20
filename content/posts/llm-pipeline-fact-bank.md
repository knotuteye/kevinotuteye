---
title: A pipeline that is not allowed to flatter me
date: 2026-11-09
summary: My job-search pipeline uses Claude to tailor applications. Every sentence it writes about me has to cite a fact, and two independent checks, one in plain code and one by another model, have to agree before I see it.
tags: AI, LLMs, TypeScript
source: Personal project · private repository
---

Language models are very good at writing a convincing résumé. That is the problem. Asked to tailor my experience to a job, a model will turn "contributed to" into "led", round 60,000 users up to "hundreds of thousands", and add a framework I have never used because the posting mentioned it. Every sentence sounds right. A few of them are not true, and those are the ones an interviewer will ask about.

I built a pipeline for my own job search that finds postings, scores them and drafts tailored applications with Claude. Most of the engineering in it is about stopping the model from flattering me.

## The fact bank

Everything starts from one Markdown file: a fact bank of what I have actually done, each item with an ID.

```md
- **RH-02** Architected and maintain a shared serverless Node.js/TypeScript
  backend on AWS (Lambda, CDK, RDS, S3, API Gateway) at 99.99% uptime.
```

Its rule is written at the top: claims may be reworded or weakened, never strengthened. Items I have not checked yet are marked `[CONFIRM]` and are off limits. Phrases I have retracted live in a "Removed, never use" section.

The model never writes free text about me. Its output is JSON, validated with Zod, and every summary sentence, bullet, cover-letter paragraph and screening answer carries the fact IDs it is based on.

## Check one: plain code

The first check needs no model at all, and it catches the most common failures cheaply and the same way every time.

Every claim must cite at least one ID, every ID must exist and be confirmed, and a fact must belong to the role it is listed under; the 99.99% uptime cannot drift into a different job. Then every number in a claim has to appear in the facts it cites:

```ts
/** Numbers like 60,000+ / 99.99% / 80%+ / 3. Skips fact IDs (RH-04) and digits glued to letters (S3, v3). */
export function extractNumbers(text: string): NumberToken[] {
  const re = /(?<![A-Za-z\d.,])\d+(?:[.,]\d+)*(%\+?|\+)?/g
  const withoutIds = text.replace(/\b[A-Z]{1,6}(?:-[A-Z0-9]+)+\b/g, ' ')
  return [...withoutIds.matchAll(re)].map((m) => {
    const suffix = m[1] ?? ''
    const value = m[0].slice(0, m[0].length - suffix.length).replace(/,/g, '')
    return { raw: m[0], value, suffix }
  })
}
```

"60,000+" in a bullet that cites RH-01 passes. "600,000" fails. So does "60,000+" in a bullet that cites a fact without that number. Number words in the facts ("three products") are normalized to digits first, so the model can say "3".

The headline tagline gets the strictest check: every word in it must come from the facts it cites or my skills list, after a crude stemmer so "integrating" can match "integrated". Titles can only use words from titles I have actually held.

## Check two: a skeptical model

Code cannot tell that "delivered" became "led", or that two true facts were merged into a claim neither supports. So a second, separate model call audits the output. Its prompt casts it as a skeptical reviewer whose job is to catch anything that would embarrass me in an interview, and it must name each problem with a type: `inflated_number`, `scope_upgrade`, `unsupported_claim` and a few others, with a suggested fix.

The two verdicts are combined, and the model does not get to overrule the code:

```ts
export function combineVerdict(local: Issue[], model: SelfCheck): Verdict {
  const issues = [
    ...local.map((i) => ({ ...i, source: 'code' as const })),
    ...model.issues.map((i) => ({ ...i, source: 'model' as const })),
  ]
  // The model's `pass` only counts when it agrees with an empty issue list.
  const pass = issues.length === 0 && model.pass
  return { pass, status: pass ? 'tailored' : 'needs_attention', issues }
}
```

A failed check does not throw the work away. The application is marked as needing attention, with the exact sentence, the problem and the fix, and gets one repair attempt before it waits for me.

## Trust the model less everywhere else

The same idea runs through the rest of the pipeline:

- **Scores are computed in code.** Haiku scores each posting against a rubric, part by part. The code clamps each part to its maximum, sums them, and caps the total at 40 if the model found a dealbreaker or a region lock. The model's own total is never used.
- **The right model for each job.** Haiku scores postings in batches, which is cheap enough to read a hundred a day. Sonnet does the tailoring and the audit. Opus only writes interview briefs. The fact bank sits in a cached system prompt, so it is not paid for on every call.
- **Every call is costed.** Token use and estimated cost go into an `events` table, so the monthly bill is a query rather than a surprise.
- **A person presses Submit.** When the pipeline fills an application form, a guard intercepts every submit event before the page sees it, so a stray Enter cannot send anything. I review the filled form and press Submit myself.

## Why I built it this way

This is a personal project, but the shape is the same as the clinical software I work on every day. A machine drafts. The draft is checked against a source of truth, first by rules that never get tired and then by a reviewer that can read for meaning. A person signs off before anything leaves the building.

Generating plausible text is the easy part now. The engineering is in making it accountable to what is true.
