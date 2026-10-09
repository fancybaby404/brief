# Screens and overlays — authoritative checklist

`design/references/current/` is the primary visual target, plus approved refinements in this document. Earlier references may conflict: latest requirements win.

## Core navigation / shared UI

- **Floating bottom bar**: white pill, low shadow, pinned above safe-area; Home, Jobs, Calendar, Mock icons+labels, blue active icon/text. Separate bright blue 56–62 pt rounded square + to its RIGHT with 8–12 pt gap, NOT centered in the pill. It floats above scrolling content. Accessible hit targets 44 pt minimum. Screen 3 job detail may still show bar as reference.
- **Top header**: left `brief` lowercase heavy black wordmark + mini HAPPY mascot (without arms); right person outline icon. Opens anchored popover, NOT another bottom tab. No notification bell on latest header.
- **Top-right account menu**: profile avatar/icon + name, then Resume, Notifications, Settings; no Career Profile entry or "Manage your career profile" subtext. Compact white anchored menu with light shadow, outside-tap dismiss, no giant blank panel.
- **+ quick menu**: anchor above and to right of blue plus. Width ≈ 50% device width, NOT full-screen bottom sheet. Exactly 2 rows, no subtexts: `Add Job`, `Ask Brief`. Add Job uses small mascot/briefcase icon; Ask Brief uses the Brief mascot / Brief logo. Dismiss tap outside. Blue plus becomes X while open. Underlying screen dimmed mildly.

## Main screens and variants

1. **Home dashboard**: large arm-free mascot on LEFT against very pale blue circle; speech/chat card on RIGHT with "Good morning" and name (tap to Ask Brief); no "Up Next" card. Beneath, `Application progress` single restrained blue **bar chart** based on actual tracked application dates, rolling last 4 weeks. No rainbow status tiles or redundant stat categories. `Recent applications` with company, role, statuses and `See all`. Empty first-run state with add CTA.
2. **Applications / See all**: ONE list, no Applications/Events segmented tabs. Search and sort (newest, oldest, company, status), status chips, job rows, empty/search empty states. Tapping opens application detail; no automatic employer API submission.
3. **Jobs / Explore**: online API feed, search, filter(s) (optional), scroll listings, offline message, latency/empty/error and refreshed results. Search respects external API limits. Mark a listing as Interested in Brief separately from opening the employer's page: bookmark icon on each card, or swipe a card left (Spotify-style, haptic at the threshold, also exposed as an accessibility action). Cards show logo, title, company, location • type, salary when listed, and industry/seniority chips.
4. **External job detail**: company, job title, location, type, salary if known, tags, long description, requirement/benefits only if in API. `Open job listing` external navigation, `Add to Brief` opens action sheet with Interested or Applied (the old "Saved" status was merged into Interested); on save updates local tracker. Show FULL detail by default, NO sheet open initially.
5. **Tracked application detail**: saved fields, source, user notes, update status, delete (confirm), Ask Brief with this exact job selected, start mock, optional timeline/follow-up.
6. **Calendar**: real month grid with date markers and events, upcoming interviews/follow-ups/deadlines, previous/next month, add/edit/delete. `See all` on events can navigate Calendar with event list scrolled/expanded (not duplicate Applications/Events page).
7. **Mock job picker**: large no-arm mascot, heading "Who are you interviewing for?", saved applications list. If none, helpful CTA to add first job.
8. **Mock session**: mascot visible, turn-based HR conversation grounded in job description + optional resume, text answers; distinct user (bright blue) and assistant (light blue) bubbles, keyboard entry, finish+feedback. Live local STT/TTS optional stretch; if absent, UI must NOT show fake listening waveform or active recording.
9. **Ask Brief**: contextual chatbot with mascot, no top 4-card suggestions (`About a job`, `My Applications`, `Interview prep`, `General advice` removed). Above composer, compact chips `What should I ask?`, `Is this a red flag?`, `Am I qualified?`. General chat and selected-job chat use same screen architecture. If local model missing: explicit setup CTA.
10. **Add Job manual / import**: company/role required; screenshot/photo OCR with on-device text recognition; model extracts structured fields when installed; editable review fields even if model fails; source URL and status (`saved`, `interested`, `applied`), no auto-application assumption. Optional later: native OS share sheet into Brief.
11. **Resume**: BIG visual preview area near top, not a filename card, not green `Ready for AI personalization` line, no "How Brief uses your resume" promo card. Below preview: compact `View`, `Replace`, `Remove` actions. Below: `Resume summary` rows (experience, education, skills, location/goals) and Edit. Empty state in large preview region: "Tap to attach your resume". Uploaded resume and editable extracted text feed local AI. PDF should eventually render true pages natively; this starter shows visually formatted summary and OS open/share.
12. **Notifications**: accessible from profile popover. Eventually actual local reminders (interviews/follow-up). MVP may show honest empty state.
13. **Settings**: display name, local model installation progress/test, permissions, privacy and data controls, optional theme settings.
14. **Onboarding** (first launch only; `onboarded` pref): four swipeable pages with page dots, Continue/Skip, and Get started/Back on the last page. (1) Welcome: wordmark, mascot on cloud with sparkles. (2) "Add jobs in seconds": Import screenshot / Take a photo / Add manually rows finish onboarding and open Add Job with that import started. (3) "Make Brief smarter with your resume": live resume preview from the profile, Upload resume (PDF/DOCX), Enter manually (form sheet), AI personalization toggle; skippable. (4) "Practice with Local AI": privacy facts and an honest note that a model is added later in Settings. No login, no forced model install. Settings → Welcome tour replays it.

## Mandatory states

Every interactive screen: blank/no data, permission denied, loading, AI model missing, AI model out of memory, OCR confidence low, offline API failure, invalid URL/salary missing, date conflict/timezone, keyboard/scroll, small phones, large Dynamic Type, dark mode later, screen reader and reduce motion.

### Implemented state matrix (components in `src/components/States.tsx`)

Every state says what happened, why, and offers the next step. Mascot mood signals tone: happy = fresh start, question = nothing found / not set up, sad = offline, error (x_x) = something broke.

| Situation | Where | State |
|---|---|---|
| No applications | Home (card), Applications, Mock picker | Happy mascot, "Add a job" + "Explore jobs" |
| Search finds nothing | Applications, Explore | Question mascot, Clear search / Reset filters |
| Offline | Explore (`JobsError` kind `offline`) | Sad mascot, Try again + "Open my saved jobs" |
| Provider error | Explore (kind `server`) | Error mascot, Try again |
| Loading jobs | Explore | Pulsing skeleton cards (static with Reduce Motion) |
| No AI model | Ask Brief, Mock picker & session | `ModelSetupCard` up front, composer disabled, Open Settings; Add Job keeps OCR text and links to setup |
| AI generating | Ask Brief, Mock | `ThinkingBubble` + header mascot in "question" mood |
| AI failed | Ask Brief, Mock | `InlineError` with Try again (re-asks without re-saving the message) |
| No resume | Resume, Mock picker hint | Question mascot, Upload resume / Enter details instead (form sheet) |
| Nothing scheduled | Calendar | Happy mascot, Add event |
| No notifications | Notifications | Honest "no reminders yet", Open Calendar |
| Screenshot import | Add Job | Step labels (reading text → filling details), inline retry on failure |
| Storage can't open | App start | Error mascot, data-is-safe message, Try again (re-runs SQLite init) |

## Navigation map

`Home -> See all -> Application detail -> Ask Brief/Mock`, `Jobs -> Job detail -> Save to tracker`, `Plus -> Add Job / Ask Brief`, `Calendar -> event`, `Mock -> job select -> session`, `Account -> Resume/Notifications/Settings`, `Onboarding -> Home`.
