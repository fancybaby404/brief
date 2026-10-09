# Screens and overlays — authoritative checklist

`design/references/current/` is the primary visual target, plus approved refinements in this document. Earlier references may conflict: latest requirements win.

## Core navigation / shared UI

- **Floating bottom bar**: white pill, low shadow, pinned above safe-area; Home, Jobs, Calendar, Mock icons+labels, blue active icon/text. Separate bright blue 56–62 pt rounded square + to its RIGHT with 8–12 pt gap, NOT centered in the pill. It floats above scrolling content. Accessible hit targets 44 pt minimum. Screen 3 job detail may still show bar as reference.
- **Top header**: left `brief` lowercase heavy black wordmark + mini HAPPY mascot (without arms); right person outline icon. Opens anchored popover, NOT another bottom tab. No notification bell on latest header.
- **Top-right account menu**: profile avatar/icon + name, then Resume, Notifications, Settings; no Career Profile entry or "Manage your career profile" subtext. Compact white anchored menu with light shadow, outside-tap dismiss, no giant blank panel.
- **+ quick menu**: anchor above and to right of blue plus. Width ≈ 50% device width, NOT full-screen bottom sheet. Root has exactly 2 rows, no subtexts: `Add Job`, `Ask Brief`. Tapping Add Job morphs this same popup into `Camera / Photo`, `Paste job link`, `Enter manually`, with a back row. Keep it anchored and compact. Add Job uses small mascot/briefcase icon; Ask Brief uses the Brief mascot / Brief logo. Dismiss tap outside. Blue plus becomes X while open. Underlying screen dimmed mildly.

## Main screens and variants

1. **Home dashboard**: large arm-free mascot on LEFT against very pale blue circle; speech/chat card on RIGHT with "Good morning" and name (tap to Ask Brief); no "Up Next" card. Beneath, `Application progress` single restrained blue **bar chart** based on actual tracked application dates, rolling last 4 weeks. No rainbow status tiles or redundant stat categories. `Recent applications` with company, role, statuses and `See all`. Empty first-run state with add CTA.
2. **Applications / See all**: ONE list, no Applications/Events segmented tabs. Search and sort (newest, oldest, company, status), status chips, job rows, empty/search empty states. Tapping opens application detail; no automatic employer API submission.
3. **Jobs / Explore**: online API feed, search, filter(s) (optional), scroll listings, offline message, latency/empty/error and refreshed results. Search respects external API limits. Mark a listing as Interested in Brief separately from opening the employer's page: bookmark icon on each card, or swipe a card left (Spotify-style, haptic at the threshold, also exposed as an accessibility action). Cards show logo, title, company, location • type, salary when listed, and industry/seniority chips.
4. **External job detail**: company, job title, location, type, salary if known, tags, long description, requirement/benefits only if in API. `Open job listing` external navigation, `Add to Brief` adds the job directly (status Interested) and confirms with a toast ("Added to Brief · View"); once added the button reads "In Brief ✓" and opens the application, where status is changed. No status choice when adding; on save updates local tracker. Show FULL detail by default, NO sheet open initially.
5. **Tracked application detail**: a workspace for one job, floating tab bar hidden. Own top bar: back, compact title on scroll, more menu (Open original posting, Share, Delete with confirm). Identity (logo, company, title, location · type · salary) → compact status button opening a status sheet (Interested, Applied, In review, Interview, Offer; Closed: Not selected, Withdrawn) → Ask Brief + Practice (this job's context) → **Up next** (stage-specific actions, upcoming events, Schedule) → About the role (overview, responsibilities/requirements from the listing, Show full description, original posting link) → Your notes (preview; private editor sheet) → Activity (saved, status moves, events). Moving to Interview offers to schedule; never creates an event by itself.
6. **Calendar**: real month grid with date markers and events, upcoming interviews/follow-ups/deadlines, previous/next month, add/edit/delete. `See all` on events can navigate Calendar with event list scrolled/expanded (not duplicate Applications/Events page).
7. **Mock job picker**: large no-arm mascot, heading "Who are you interviewing for?", saved applications list. If none, helpful CTA to add first job.
8. **Mock session**: mascot visible, turn-based HR conversation grounded in job description + optional resume, text answers; distinct user (bright blue) and assistant (light blue) bubbles, keyboard entry, finish+feedback. Voice mode (offline Whisper STT + on-device platform TTS) when the speech models and an on-device voice are installed: the listening ring follows the real mic level, the speaking indicator shows only while TTS plays, transcripts are editable before sending; otherwise the same interview is typed. Never a fake waveform or recording state.
9. **Ask Brief**: contextual chatbot with mascot, no top 4-card suggestions (`About a job`, `My Applications`, `Interview prep`, `General advice` removed). Above the composer, show compact follow-up chips generated by the on-device model from the current conversation; hide them when no model is installed. A plus button attaches an image only when the loaded local model reports vision support. General chat and selected-job chat use the same screen architecture. If local model missing: explicit setup CTA.
10. **Add Job**: the plus menu stays open while Add Job expands to three choices. `Camera / Photo` opens an in-app full-screen Expo Camera with shutter, gallery, flash, close, preview, retake, and use-photo controls; then on-device OCR and optional Local AI extraction lead to editable review. Permission denial and OCR/model failures retain a manual path. `Paste job link` is a short URL sheet; fetch readable public listing text where possible, extract locally, then review. Blocked or unreadable links explain why and offer manual entry. `Enter manually` is a draggable, keyboard-safe sheet with required company and position, optional description/notes, and collapsed location/salary/type/source fields. Save locally as Interested; never submit to an employer.
11. **Resume**: BIG visual preview area near top, not a filename card, not green `Ready for AI personalization` line, no "How Brief uses your resume" promo card. Below preview: compact `View`, `Replace`, `Remove` actions. Below: `Resume summary` rows (experience, education, skills, location/goals) and Edit. Empty state in large preview region: "Tap to attach your resume". Uploaded resume and editable extracted text feed local AI. PDF should eventually render true pages natively; this starter shows visually formatted summary and OS open/share.
12. **Notifications**: accessible from profile popover. Eventually actual local reminders (interviews/follow-up). MVP may show honest empty state.
13. **Settings**: clean grouped cards for profile, on-device AI, preferences, and support. The profile row uses the Brief mascot mark. Preferences include salary currency, a persisted 12-hour/24-hour time format applied to in-app time displays, and exchange rates. Offer Qwen3-VL 2B plus its matching image encoder; start downloading only after the user taps Download, show combined progress, and keep the current model unless the new pair passes a local text and vision check.
14. **Onboarding** (first launch only; `onboarded` pref): four swipeable pages with page dots, Continue/Skip, and Get started/Back on the last page. (1) Welcome: wordmark, mascot on cloud with sparkles. (2) "Add jobs in seconds": informational rows for screenshots, photos, and manual entry; Add Job launches from the floating plus after onboarding. (3) "Make Brief smarter with your resume": live resume preview from the profile, Upload resume (PDF/DOCX), Enter manually (form sheet), AI personalization toggle; skippable. (4) "Practice with Local AI": privacy facts and an optional Qwen3-VL model plus matching image encoder. Downloads start only after the user taps; show combined progress and validate text and vision support before switching. Lock onboarding navigation during setup; failures retain the current model with a retry path. No forced install. Settings → Welcome tour replays it.

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
