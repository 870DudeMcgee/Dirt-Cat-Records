# Dirt Cat Growth Tools And Trust Engine Brainstorm

Date: 2026-05-21
Project: Dirt Cat Records growth tools, lead magnets, education, community, and quick-win service offers
Status: Idea dump captured and shaped before implementation planning

## Skill Routing

- Requested process skill: `brainstorming`
- Purpose: preserve rough ideas while they are fresh, then shape them into concrete options, risks, and a recommended starting sequence.
- Next-step skill after approval: `writing-plans`

This document is a brainstorm/spec artifact, not an implementation plan. It intentionally keeps more ideas than the business should build at once. When one lane is approved, write a separate plan with file paths, tasks, launch copy, tests, analytics, verification steps, and rollback notes.

## Capture Context

The raw idea is a Dirt Cat growth engine built around useful free tools, educational resources, visible expertise, community goodwill, and small paid audits that convert naturally into full mixing/mastering work. The Logic stem exporter is one strong anchor, but it should not be the only bet. The broader opportunity is to make Dirt Cat the place artists go when they want their songs, stems, references, and expectations to be mix-ready.

The important emotional truth: creativity is fleeting. This document should preserve the sparks before they get sanded down into a sterile backlog.

## Problem Statement

Independent artists and home-studio producers often know their songs need outside ears, but they do not know whether their files are organized, their mix is technically ready, their references make sense, or their budget should go toward a full mix, a review, a cleanup audit, or education. Dirt Cat can win trust by helping before asking for a big purchase.

The challenge is choosing a first sequence that creates useful public value, captures qualified leads, and feeds the existing checkout, portal, quote, and admin workflow without overloading the active launch-hardening work.

## Goals

- Capture and organize the current idea dump without prematurely narrowing it.
- Turn each idea into a concrete product/content/service shape.
- Compare the main strategic paths and tradeoffs.
- Identify the quickest trust-building slices.
- Clarify how the free/freemium tools support paid mixing work instead of becoming unrelated side quests.
- Preserve the Logic stem exporter as a flagship future tool while naming lower-effort lead magnets that can launch sooner.
- Keep future implementation aware of the current repo constraint: Stage 7 launch hardening remains the active delivery priority.

## Constraints

- The current web repo is already near the Vercel Hobby function limit, so new API-heavy ideas must wait or consolidate into existing endpoints.
- The existing checkout, portal, admin, Drive, email, and PayPal workflows need Stage 7 external verification before major new product surfaces are added.
- The Logic stem exporter likely belongs in a separate desktop-app repo, not this web runtime.
- The best near-term ideas should be useful even if the analyzer/exporter software takes longer than expected.
- Any upload-based tool must handle user privacy, file size, consent, storage costs, and deletion policy explicitly.
- Content production capacity matters. A brilliant recurring series that cannot be sustained can quietly turn into a trust leak.
- Lead capture should feel like a fair exchange, not a trap door.

## Non-Goals For The First Pass

- Building every idea immediately.
- Replacing the active Stage 7 launch-hardening roadmap.
- Adding a new custom backend for large audio analysis before the core business workflow is live-verified.
- Creating a full course platform, paid community, or subscription content product in the first slice.
- Over-promising automated mix judgment. Automated tools can flag likely technical issues; they should not pretend to replace human taste.

## Product Thesis

Dirt Cat can build a trust ladder:

1. **Preparation**: help artists organize files and avoid avoidable mistakes.
2. **Diagnosis**: help artists understand what is technically wrong or uncertain.
3. **Education**: show how professional decisions improve real songs.
4. **Relationship**: let artists get feedback and see the human behind the studio.
5. **Conversion**: offer a small paid audit or full mix when the artist has enough trust to move.

The unifying idea is a **Dirt Cat Readiness Score**. It can appear in a checklist, PDF, web analyzer, manual audit, free mix review, and later the stem exporter. The score should be humble and practical: file organization, naming, start alignment, clipping, noise, references, notes, deliverables, and confidence level.

## Audience Segments

### Home-Studio Artists

Need help knowing whether their files are usable and their rough mix communicates the song. They respond to checklists, templates, free reviews, short videos, and affordable audits.

### Serious Indie Bands And Producers

Need repeatable prep workflows, reference strategy, collaboration, and confidence before sending songs out. They respond to before/after proof, templates, stem tools, and visible studio process.

### Remote Mixing Clients

Need low-friction handoff, clear expectations, and a sense that Dirt Cat will not make the process mysterious. They respond to upload guides, portal clarity, project support, and human feedback.

### Aspiring Mixers

May not buy mixing services immediately, but can become long-term audience, referral source, template buyer, or community participant. They respond to education, breakdowns, Q&A, and preset packs.

## Strategic Options Compared

### Option A: Free Utility Ladder

Build practical tools that solve painful prep problems: Session Prep Checklist, Logic template pack, Stem Quality Analyzer, Reference Track Comparator, and Stem Exporter.

Pros:

- Highest qualified lead potential.
- Differentiates Dirt Cat from generic studio sites.
- Creates reusable product IP.
- Naturally points toward mixing, mix review, and handoff services.

Cons:

- Software work can become deep quickly.
- Upload tools introduce privacy, storage, cost, and support concerns.
- The best tools need maintenance.
- The flagship Stem Exporter is a serious multi-week or multi-month effort.

Best use: anchor the long-term growth engine, but start with low-code assets before upload-heavy tools.

### Option B: Education And Proof Library

Build content assets: Remote Mixing Survival Guide, monthly before/after breakdowns, Logic workflow templates, and Ask Dirt Cat Q&A.

Pros:

- Faster to launch than software.
- Builds trust through taste, voice, and proof.
- Supports SEO, YouTube, email, and social clips.
- Can be repurposed into lead magnets, onboarding emails, and sales pages.

Cons:

- Requires consistency.
- Differentiation depends on personality and specificity, not just information.
- Conversion paths must be explicit or content becomes an audience-only activity.

Best use: first public layer of the growth engine because it can launch while the product tools mature.

### Option C: Community And Collaboration

Build a private feedback group, curated playlist, submission flow, and behind-the-scenes studio presence.

Pros:

- Creates relationships and goodwill.
- Lets Dirt Cat see real pain points before building tools.
- Can turn artists into advocates even before they buy.
- Good source of Q&A, breakdown, and audit topics.

Cons:

- Moderation takes emotional and time bandwidth.
- A quiet community can look worse than no community.
- Community should not launch before there is enough content and audience gravity.

Best use: add after the first content/tool loop is moving, not as the first bet.

### Option D: Quick-Win Service Add-Ons

Improve Free Mix Review, add Mix Ready in One Hour Audit, and create Preset/Print Packs.

Pros:

- Directly monetizable.
- Easier to validate demand.
- Uses existing studio expertise and current operational workflow.
- Can convert warm leads quickly.

Cons:

- The owner is the bottleneck.
- Paid mini-services need clear scope boundaries.
- Preset packs can attract buyers who are not service clients unless positioned carefully.

Best use: make the free review and paid audit the conversion bridge between content/tools and full services.

### Option E: Integrated Readiness Funnel

Unify the best of A through D around one promise: get your song ready for a better mix. The funnel begins with a guide/template, moves into free review or analyzer, offers a paid audit, and escalates to full mixing.

Pros:

- Strongest business fit.
- Lets each idea reinforce the others.
- Gives the website a clearer educational/product ecosystem.
- Avoids betting everything on one large software build.

Cons:

- Needs careful sequencing.
- Requires naming, scoring, email capture, and service handoff consistency.
- Can sprawl unless each layer has a clear job.

Best use: recommended direction.

## Recommended Direction

Use Option E as the overall strategy, with Option B and Option D as the first launchable slices, and Option A as the longer-term product ladder.

Recommended sequence:

1. Launch the **Remote Mixing Survival Guide** plus **Before You Send Stems Checklist** and **Session Prep Template Pack** as a single low-effort lead magnet.
2. Upgrade the existing **Free Mix Review** into a more valuable delivery format: written notes, a 60-second voice memo, and a simple readiness score.
3. Add a paid **Mix Ready in One Hour Audit** for artists who want certainty before buying a full mix.
4. Begin the **Before/After Breakdown** series using one permission-cleared track or a demo track.
5. Prototype the **Stem Quality Analyzer** or **Reference Track Comparator** only after the first lead magnet and audit loop show demand.
6. Keep the **Logic Stem Exporter** as the flagship free/freemium software path in its own repo once the current web launch is stable.

This gives Dirt Cat something useful to publish quickly, something valuable to sell cheaply, and a product ladder that can become more technical over time.

## Idea Catalogue

### 1. Session Prep Checklist And Template Pack

What it is: a downloadable Logic template, track naming convention, color coding scheme, bus routing starter, export settings reference, and PDF checklist called **Before You Send Stems**.

Audience pain: artists know they need to send stems, but they are unsure how to name tracks, align files, include references, print effects, or avoid wasting the mixer's time.

V1 shape:

- PDF checklist.
- Logic session template.
- Example folder structure.
- Example stem filenames.
- Short landing page with email capture.
- Follow-up email that points to Free Mix Review or Mix Ready Audit.

Lead capture exchange: email for the pack, with explicit consent to receive prep tips and service offers.

Differentiation:

- Dirt Cat voice: practical, studio-tested, no shame.
- Remote-mixing-specific, not a generic DAW template.
- Tied to actual project intake and Drive handoff.

First slice:

- Create a single PDF/checklist in markdown or design tool.
- Add one landing section later, not before Stage 7 closes.
- Use the checklist as the backbone for the readiness score.

Risks:

- Too much detail can overwhelm beginners.
- Logic-only template may exclude non-Logic users unless the PDF stays DAW-agnostic.

### 2. Stem Quality Analyzer

What it is: a web or desktop tool where users upload stems and receive flags for common technical issues plus a Dirt Cat Readiness Score.

Possible checks:

- Clipping or true peak risk.
- Files not starting at the same timestamp.
- Different sample rates or bit depths.
- Mismatched durations.
- Near-silent files.
- Excessive noise floor.
- Phase correlation warnings for stereo files.
- Suspiciously hot low end.
- Missing rough mix or reference track.
- Bad naming patterns.

V1 shape options:

- Manual/offline audit first: user uploads a zip through existing intake, owner sends report.
- Local-only desktop analyzer: avoids server upload costs and privacy concerns.
- Web analyzer: easiest for lead capture but hardest for storage/cost/privacy.

Lead capture exchange: free limited analysis for email, paid audit for full report.

Differentiation:

- Converts a scary technical topic into clear readiness language.
- Pairs automated flags with a human upsell.
- Strong bridge into the Stem Exporter later.

Implementation notes:

- Avoid large-file web uploads until storage/deletion policy is designed.
- Use local analysis or serverless metadata-only upload if possible.
- Audio analysis should be framed as "likely issue" detection, not final judgment.

Risks:

- False positives can annoy users.
- Large audio files can exceed Vercel/serverless comfort zones.
- Privacy policy and deletion guarantees are mandatory.

### 3. Reference Track Comparator

What it is: a simple tool where users upload their mix and 2-3 references. It analyzes loudness and broad tonal balance, then gives basic tips and offers a human review.

Possible checks:

- Integrated loudness and peak comparison.
- Broad frequency balance buckets: sub, low, low-mid, mid, presence, air.
- Stereo width comparison.
- Dynamic range rough comparison.
- Reference mismatch warnings, such as comparing a raw rough mix to a mastered commercial track without context.

V1 shape:

- Start as a content/template resource: "How to Choose References" plus a manual comparator worksheet.
- Later prototype local browser analysis for short clips or offline desktop analysis.

Lead capture exchange: email for reference worksheet; paid review for specific notes.

Differentiation:

- Teaches artists how to think in mix references rather than chasing loudness blindly.
- Lets Dirt Cat demonstrate taste and restraint.

Risks:

- Automated advice can become generic fast.
- Copyright and storage handling for uploaded references must be clean.

### 4. Mix Feedback Simulator

What it is: a limited-slot lead magnet where artists upload a rough mix and receive a short human critique as video/audio or voice memo.

Better name options:

- Dirt Cat First Listen.
- Rough Mix Reality Check.
- 60-Second Mix Notes.
- Free Mix Review Plus.

V1 shape:

- Keep it human, not simulated.
- Limit slots per week.
- Deliver one written priority list plus one 60-second voice memo.
- Include a readiness score and next recommended step.

Lead capture exchange: user submits email and rough mix link, agrees to receive the critique and follow-up.

Differentiation:

- Human voice builds trust faster than a generic PDF.
- Sets up the paid audit or full mix naturally.

Risks:

- Time can spiral unless scope is strict.
- Users may expect a full mix consultation for free.

### 5. Remote Mixing Survival Guide

Working title: **How to Prepare Stems So Your Mixer Does Not Hate You**.

What it is: a free PDF/ebook that teaches file organization, naming, rough mix best practices, references, communication tips, and common mistakes.

V1 outline:

1. What your mixer actually needs.
2. How to export stems that line up.
3. Naming files so nobody has to guess.
4. What to include: rough mix, references, BPM, key, notes, lyrics, deliverables.
5. What not to send.
6. How to explain your vision without over-directing.
7. The Dirt Cat readiness checklist.
8. Next steps: free review, paid audit, full mix.

Lead capture exchange: email-gated download.

Differentiation:

- Opinionated and funny without being mean.
- Practical enough to print and use.
- Works for any DAW, so it broadens beyond Logic.

Risks:

- Generic ebook problem. It must use Dirt Cat voice, examples, screenshots, and real-world mistakes.

### 6. Monthly Before/After Breakdowns

What it is: a recurring video or article showing what changed in a client or demo track and why.

V1 shape:

- Start monthly, not weekly.
- Use client permission or an owned demo.
- Pair video with a short blog post and email.
- Include 3-5 specific decisions: vocal pocket, low-end cleanup, drum bus movement, saturation, arrangement cleanup, reference translation.

Lead capture exchange: public content plus email signup for full notes, session screenshots, or checklist.

Differentiation:

- Strongest trust builder because it proves taste and process.
- Lets potential clients hear the value before buying.

Risks:

- Permission and before/after audio rights need explicit approval.
- Production effort can become too high.

### 7. Logic Pro Workflow Templates

What it is: Logic templates, Environment setups, macro packs, and stock-plugin chains for genres such as indie rock, Americana, hip-hop, singer-songwriter, and podcast/voice.

V1 shape:

- Start with one **Dirt Cat Remote Mix Prep Logic Template**.
- Include naming, colors, buses, print tracks, rough mix track, references track, and export notes.
- Keep plugin chains stock or clearly label third-party requirements.

Lead capture exchange: email for basic template, paid or newsletter bonus for advanced variants.

Differentiation:

- Directly supports the Stem Exporter roadmap.
- Builds trust with Logic users before the desktop app exists.

Risks:

- Templates can break or confuse users across Logic versions.
- Support load can grow if users treat it like a custom tech support channel.

### 8. Ask Dirt Cat Q&A Series

What it is: weekly or biweekly short answers to artist questions about mixing, prep, references, stems, revision notes, gear, and remote collaboration.

V1 shape:

- Simple form prompt: "What is blocking your mix right now?"
- Answer one question per short video, email, or post.
- Tag answers by topic so they become a knowledge base.

Lead capture exchange: question submission with email consent; public answer may anonymize the artist.

Differentiation:

- Builds the Dirt Cat voice and makes the brand feel reachable.
- Supplies endless content from real pain points.

Risks:

- Needs moderation and boundaries.
- Weekly cadence may be too much at first; biweekly is safer.

### 9. Private Indie Mixer Feedback Group

What it is: a Discord, Circle, or similar community for honest mix feedback, occasional live critiques, and prep/accountability.

V1 shape:

- Do not launch first.
- Start as an invite-only beta from free review/audit participants.
- Run one monthly live critique or office hour.
- Create rules around respectful feedback, no spam, and no mix theft.

Lead capture exchange: application or invite tied to email list.

Differentiation:

- Positions Dirt Cat as the helpful expert, not just a vendor.
- Can become a steady source of referrals and content topics.

Risks:

- Empty-room risk.
- Moderation load.
- Community can dilute focus if not tied to services and education.

### 10. Collaborative Playlist And Curated Discoveries

What it is: **Dirt Cat Approved** playlists or artist discovery features for unsigned artists, including tracks not mixed by Dirt Cat.

V1 shape:

- Monthly playlist update.
- Submission form with opt-in email.
- One or two featured artist blurbs.
- Optional "what works about this mix" note.

Lead capture exchange: playlist submission and newsletter signup.

Differentiation:

- Builds goodwill beyond direct sales.
- Makes Dirt Cat feel like a scene participant, not just a service provider.

Risks:

- Playlist growth is platform-dependent.
- Need clear expectations that submission does not guarantee placement.

### 11. Gear And Studio Behind-The-Scenes

What it is: short videos showing the analog chain, console, studio room, Arkansas vibe, routing decisions, and the human process behind the sound.

V1 shape:

- Short clips, not overproduced documentaries.
- Tie each post to a lesson or sound: vocal chain, drum bus, saturation, print path, room tone, revision workflow.
- Reuse clips in service pages and emails.

Lead capture exchange: mostly ungated awareness content, with CTAs to guide/review/audit.

Differentiation:

- Humanizes the brand.
- Justifies pricing through visible care and signal chain.

Risks:

- Gear content can attract gear fans who never become clients unless every post ties back to artist outcomes.

### 12. Free Mix Review Optimized

What it is: an improved version of the existing free review that delivers more perceived value and clearer conversion guidance.

V1 shape:

- Written notes with 3 priority issues.
- 60-second voice memo.
- Dirt Cat Readiness Score.
- One recommended next step: self-fix, paid audit, quote, or full mix.
- Follow-up email sequence after delivery.

Lead capture exchange: existing free review flow.

Differentiation:

- Human and actionable.
- Turns free review from a generic lead form into an experience.

Risks:

- Owner time must be capped.
- Needs templates so every review does not start from zero.

### 13. Mix Ready In One Hour Audit

What it is: a paid mini-service, likely $49-99, where Dirt Cat checks stems and sends a concise readiness report.

V1 shape:

- User uploads stems or shares Drive link.
- Dirt Cat checks organization, alignment, clipping, obvious noise, rough mix, references, and notes.
- Deliver a readiness report within a defined time window, not necessarily exactly one hour until operations prove it.
- Credit part of the fee toward a full mix if purchased within a short window.

Possible names:

- Mix Ready Audit.
- Stem Check Express.
- Dirt Cat Readiness Audit.
- Mix Ready in One Hour, if the delivery promise is operationally safe.

Lead capture exchange: paid checkout, then quote/full mix upsell.

Differentiation:

- Concrete, low-price trust bridge.
- Helps artists avoid paying for a full mix before they are prepared.

Risks:

- Time promise can become stressful.
- Scope creep if users expect arrangement, production, or mixing advice beyond readiness.

### 14. Preset And Print Packs

What it is: analog-modeled print chains, bus processing templates, Logic channel strip settings, and stem-print workflows.

V1 shape:

- Start free or low-cost with one pack: **Dirt Cat Rough Mix Polish Pack** or **Remote Stem Print Pack**.
- Use stock Logic plugins when possible.
- Include a PDF on when not to use the presets.

Lead capture exchange: email for free pack; paid upgrade later.

Differentiation:

- Gives producers a taste of Dirt Cat's workflow.
- Can pair with before/after content.

Risks:

- Presets can imply magic fixes.
- Support load grows if compatibility is unclear.

## Prioritization Matrix

| Idea                          | Effort      | Traffic/Lead Potential | Differentiation | Conversion Fit | Recommended Timing                        |
| ----------------------------- | ----------- | ---------------------- | --------------- | -------------- | ----------------------------------------- |
| Session Prep Guide + Template | Low         | High                   | Medium-High     | High           | First                                     |
| Free Mix Review Optimized     | Low         | High                   | High            | Very High      | First                                     |
| Remote Mixing Survival Guide  | Low-Medium  | High                   | Medium          | High           | First                                     |
| Before/After Breakdowns       | Medium      | Very High              | Very High       | High           | Early                                     |
| Mix Ready Audit               | Low-Medium  | Medium-High            | High            | Very High      | Early                                     |
| Logic Workflow Templates      | Medium      | Medium-High            | Medium-High     | Medium-High    | Early after guide                         |
| Stem Quality Analyzer         | Medium-High | High                   | Very High       | High           | Prototype after demand proof              |
| Reference Track Comparator    | Medium      | Medium-High            | Medium          | Medium         | Prototype after education proof           |
| Stem Exporter                 | High        | Very High              | High            | Very High      | Separate repo after launch stability      |
| Ask Dirt Cat Q&A              | Low-Medium  | Medium                 | Medium          | Medium         | Start biweekly when content rhythm exists |
| Feedback Community            | Medium      | Medium-High            | High            | Medium-High    | Later                                     |
| Playlist/Curated Discoveries  | Low-Medium  | Medium                 | Medium          | Low-Medium     | Later or lightweight side channel         |
| Gear/Studio BTS               | Low         | Medium                 | Medium-High     | Medium         | Ongoing support content                   |
| Preset/Print Packs            | Medium      | Medium                 | Medium          | Medium         | After templates prove interest            |

## Traffic Strategy

### Search And Evergreen

- Target searches around "how to prepare stems for mixing," "how to send stems to a mixing engineer," "Logic Pro stem export," "mix reference tracks," and "are my stems mix ready."
- Turn the Survival Guide into several smaller articles.
- Use the checklist as the CTA on every prep article.

### YouTube And Short Video

- Before/after breakdowns become the main proof channel.
- Q&A answers become short clips.
- Studio behind-the-scenes clips build familiarity.
- Every video points to the guide, free review, or audit.

### Email

Core welcome sequence:

1. Deliver the guide/template.
2. Send the most common stem prep mistakes.
3. Share one before/after breakdown.
4. Invite a free mix review.
5. Offer the paid Mix Ready Audit.
6. Invite a quote or full service checkout.

### Community And Goodwill

- Use playlist submissions and Ask Dirt Cat questions to meet artists before they are ready to buy.
- Invite strong-fit people into beta tools or critique sessions.
- Keep the tone generous and practical.

### Existing Site Funnel

Future website surfaces:

- A Resources page for guide, checklist, templates, Q&A, and breakdowns.
- A Mix Readiness landing page with the score model.
- A paid audit checkout path.
- A future Tools page for Stem Analyzer, Reference Comparator, and Stem Exporter.

## Funnel Map

### Preparation Path

Guide or template download -> email sequence -> free review -> paid audit or full mix.

### Diagnosis Path

Analyzer or reference comparator -> readiness score -> recommended fix list -> audit or quote.

### Proof Path

Before/after breakdown -> email signup -> free review -> quote.

### Relationship Path

Q&A, playlist, or community -> repeat exposure -> free review or audit -> paid work.

### Software Path

Stem exporter or analyzer -> email capture -> direct-to-Dirt-Cat handoff -> full mix quote.

## Dirt Cat Readiness Score

The readiness score should become the shared language across tools and services.

Possible categories:

- File organization.
- Stem alignment.
- Naming clarity.
- Audio health.
- Rough mix/reference quality.
- Notes and communication.
- Delivery completeness.
- Confidence level.

Score labels:

- **Ready To Mix**: files are clean enough to start.
- **Almost Ready**: small fixes needed.
- **Needs Prep**: technical issues could waste mix time.
- **Needs Review**: not enough information to judge.

Guardrail: do not shame users. The score should feel like a helpful studio assistant, not a report card from a mean engineer.

## Existing Repo Integration Notes

This brainstorm should stay separate from active Stage 7 launch hardening.

Near-term additions should avoid new Vercel Function entrypoints unless an existing route can safely own the behavior. Static resources, downloadable PDFs, content pages, and copy updates are safer than upload-heavy analysis tools inside the current web repo.

Likely future web repo additions after launch hardening:

- Static Resources page.
- Static guide/checklist landing page.
- Updated Free Mix Review delivery copy.
- Checkout service for Mix Ready Audit if approved.
- Admin/customer metadata for readiness score, if it becomes operationally useful.

Likely separate repos/products:

- `dirtcat-stem-exporter` desktop app.
- Any local desktop audio analyzer that avoids web upload/storage constraints.

## Risks And Mitigations

| Risk                                         | Mitigation                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Too many ideas create no finished launch     | Pick one first public lead magnet and one conversion bridge                |
| Upload tools create storage/privacy problems | Start with local/offline/manual audits before web uploads                  |
| Free reviews consume too much time           | Use strict templates, slots, and 60-second voice memo limits               |
| Content cadence collapses                    | Start monthly or biweekly, then increase only after consistency is proven  |
| Automated scoring feels fake                 | Use scoring for technical readiness, not artistic judgment                 |
| Community launches empty                     | Wait until guide, reviews, and breakdowns create an invite pool            |
| Presets attract non-client traffic           | Position packs around preparation and print workflows, not magic mixing    |
| New features distract from Stage 7           | Treat this doc as future product exploration until launch hardening closes |
| Vercel function cap blocks new tool APIs     | Prefer static/downloadable assets first and consolidate future APIs        |
| Logic-only resources narrow the audience     | Keep the guide/checklist DAW-agnostic and Logic templates as bonus assets  |

## Unknowns To Close Early

- Which first lead magnet feels most urgent to artists already landing on the site?
- Does the audience prefer a funny blunt guide title or a more polished studio title?
- What weekly time budget is realistic for free reviews and voice memos?
- Should the paid audit promise a fixed turnaround or a softer priority window?
- Can a readiness score be tracked in the existing admin/project data without cluttering the workflow?
- Which content format is easiest to sustain: article, short video, long video, email, or voice-note style?
- What privacy language is needed before any analyzer or upload-based tool exists?
- Would the first template pack be Logic-only, DAW-agnostic folder/checklist, or both?
- Should audit fees be credited toward full mixing services?
- Which offer should be the main CTA after the guide: free review, paid audit, or checkout consultation?

## Recommended First Development Slice

Build the **Mix Readiness Starter Kit**.

Included:

- Remote Mixing Survival Guide.
- Before You Send Stems checklist.
- Basic folder/naming template.
- Logic prep template as a bonus if it can be produced quickly.
- Free Mix Review delivery upgrade template.
- Dirt Cat Readiness Score v0.

Not included:

- Web audio uploads.
- Automated analyzer.
- Reference comparator.
- New community platform.
- Desktop app work.
- New Vercel Functions.

Definition of done:

- One downloadable guide/checklist asset exists.
- One landing page or planned page section has clear copy and CTA.
- One free review response template exists with written notes, voice memo prompt, score categories, and next-step recommendations.
- One paid audit offer outline exists with scope, price range, turnaround, and conversion path.
- Follow-up emails are drafted.
- The next implementation plan names exact repo files and confirms whether the work waits until Stage 7 closes.

## Open Decisions

- What is the public name: Mix Readiness Starter Kit, Remote Mixing Survival Guide, Before You Send Stems, or Dirt Cat Readiness Kit?
- Is the guide email-gated, fully public, or public with bonus templates gated?
- Does Free Mix Review keep its current name or become First Listen / Rough Mix Reality Check?
- Does the paid audit launch at $49, $79, $99, or invite-only beta pricing?
- Should the first before/after use a real client track, an owned demo, or a public-domain/stem challenge style source?
- Should the first template pack be Logic-only or include generic folder structures for any DAW?
- Should the readiness score appear publicly on the site before the operational workflow supports it?
- Where does this live in navigation: Resources, Tools, Start Here, or Mix Readiness?

## Acceptance Criteria For This Brainstorm

- The problem statement is clear.
- At least two strategic options were compared.
- Tradeoffs are documented.
- A recommended approach is chosen.
- The raw ideas are preserved in recognizable form.
- The first development slice is smaller than the total vision.
- Stage 7 launch hardening remains protected from new-feature sprawl.

## Checklist

- [x] Problem statement is clear
- [x] At least 2 options compared
- [x] Tradeoffs documented
- [x] Recommended approach chosen
