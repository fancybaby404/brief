# End-to-end user journeys and domain language

1. **First launch**: Welcome -> optional resume/skills -> optional Local AI page where users can download a recommended model in Brief or import a compatible file -> skip allowed -> dashboard blank state -> tap +. The local LLM is not required for basic tracking.
2. **Add a job**: + -> Add Job submenu -> Camera / Photo, Paste job link, or Enter manually. Camera opens the in-app camera with gallery, capture preview, retake, and use-photo; on-device OCR and optional local extraction lead to editable review. Link import fetches readable page text and uses Local AI only; blocked pages explain the error and offer manual entry. Manual input requires only company and position, with other fields under More details. Every path saves as Interested and never submits to an employer.
3. **Discover job**: Jobs (network) -> list -> details -> Open job listing (external) OR Add to Brief (bookmark, swipe left, or the Add to Brief button). Status is changed afterwards on the application page with the status tracker. `Mark as applied` means *user reports they applied*. No API button pretends job was submitted.
4. **Follow-up**: Home Recent -> application -> update status, notes; Calendar -> create event manually. List/graph recalculate from real data.
5. **Resume**: top-right person -> Resume -> tap large empty preview -> PDF/DOCX -> locally save. Digitally generated PDFs can extract embedded text; scanned PDF/DOCX summary needs manual entry until further parser support. Read-only preview and Edit summary are separate concerns.
6. **Chat**: + -> Ask Brief, or application details -> Ask Brief scoped to job. If model missing, explicit Settings callout. General chat has saved applications and optional resume; job-specific should prioritize selected job.
7. **Mock**: tab -> select saved application -> LLM asks question one at a time -> applicant types answer -> model adaptive follow-up -> finish -> actionable feedback. Resume optional and user-consented; no false company-affiliation.
8. **Offline**: airplane mode -> dashboard/applications/calendar/resume; chat and mock work if model installed. Jobs API shows offline error and does not block app.

## Status semantics

- `interested`: bookmarked; might apply, has not applied. (Former `saved` status merged here; old rows load as `interested`.)
- `applied`: actually submitted an application by user externally, as reported by user.
- `under_review`: employer reviewing, as reported by user.
- `interview`: interview invited/scheduled.
- `offer`: offer received.
- `rejected`: unsuccessful/closed outcome.

## Event semantics
Manual interview, follow-up, deadline or personal reminder with local date/time. Event isn't application; links to application optionally. Store ISO date/time; keep timezone source explicit when adding external calendar APIs later.
