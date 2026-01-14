**⚠️ Codebase is SINGLE SOURCE OF TRUTH. This doc may be outdated. Verify against actual code.**

---

## APP SUMMARY

Trading Rules Tracker - iOS app to help traders track daily adherence to their trading rules with visual progress tracking.

**Target Audience:** Day traders and active traders

**Core Value Prop:** Simple daily check-in to build discipline and visualize rule compliance over time

**Vision:** Help traders build consistent habits through accountability and progress visualization

---

## TECH STACK

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo |
| Navigation | Expo Router |
| Styling | React Native StyleSheet |
| State (Client) | React Context (AppContext, ThemeContext) |
| State (Server) | N/A (local storage only) |
| Backend | AsyncStorage (local) |
| Auth | N/A |
| Notifications | expo-notifications (local scheduling) |

**Key Commands:**
- `npx tsc --noEmit` — TypeScript check
- `npx expo start` — Dev server
- `npx expo start --ios` — iOS simulator

---

## TARGET UX

[Describe the feeling users should have when using your app]

- User feels [emotion] immediately
- Minimal cognitive load
- [Other UX goals]

---

## WRITING & COPY STANDARDS

**Reading Level:** Simple, conversational. Avoid jargon.

**Tone:** [e.g., Friendly expert, Professional, Casual]

**Language Rules:**
- Use "I" and "Let's" for warmth
- Be direct, not corporate
- Say it in fewer words. Then cut more.

---

## UX PSYCHOLOGY

Apply to ALL user-facing features:

1. **Personalization = Value** - Reference THEIR specific data/goals. Generic = ignored.
2. **Progress & Investment** - Show how far they've come. Invested users stay.
3. **Loss Aversion** - What they'll LOSE hits harder than gains.
4. **Reduce Friction (HIGHEST IMPACT)**
   - Every tap = potential drop-off. Question every tap.
   - Pre-select smart defaults from their data
   - Auto-advance when one logical choice
   - Never ask users to remember/re-enter info
   - If we can infer it, don't ask it

---

## CORE RULES

### Verification (Non-negotiable)

1. **VERIFY FULL CHAIN:** After any code changes, trace: UI → handler → function → store → DB → outcome. Verify each link is CONNECTED. Flag dead code, missing imports, orphan functions.

2. **ROOT CAUSE FIXES:** Ensure fixes solve root issues, not bandaid solutions. Look downstream for ripple effects before suggesting.

3. **RUN CHECKS:** After changes, run `npm run typecheck` then `npm run lint`. Fix all errors.

4. **FULL IMPACT ANALYSIS (Before declaring complete):**
   - Find all usages of the function/variable/component you're touching
   - Trace all paths - don't assume there's only one way to reach the code
   - Ask "what else works like this?" - fix patterns, not just instances
   - Try to break your own fix
   - Verify after implementing

5. **PERSISTENT ERRORS:**
   - 2nd attempt fails → investigate root cause thoroughly, don't assume anything
   - 3rd attempt fails → check for overriding dependencies, make a checklist of what needs to be tried

6. **RUN MENTAL SIMULATIONS:** After implementing, run multiple scenarios to test for bugs and edge cases.

### Workflow

7. **ASK BEFORE ACTING:** Questions ≠ permission to change code. Don't implement without asking.

8. **NO CODE IN CHAT:** Clean terminal only. Concise summaries.

9. **COMPLETION SIGNAL:** When done and waiting for user: `afplay /System/Library/Sounds/Glass.aiff`

10. **SUGGEST BETTER ALTERNATIVES:** If you have a more efficient/effective approach, suggest it with reasoning.

11. **CLEANUP DEBUGGING:** After a fix is confirmed working, prompt to remove debugging code to keep codebase clean.

12. **FEATURE DOCUMENTATION:** If implementing a new feature, update relevant documentation.

### Code Quality

13. **SIMPLICITY:** Minimal code impact. No over-engineering. No shortcuts. Every change should impact as little code as possible.

14. **DON'T DELETE BLINDLY:** Never remove required functionality just because it errors. Re-implement if needed.

15. **NO MULTIPLE .md FILES:** Don't create additional markdown files without asking permission first.

### UI/UX

16. **DEVICE COMPATIBILITY:** Ensure all UI works across target devices.

17. **PLATFORM STANDARDS:** Meet or exceed platform design guidelines. Use haptic feedback on key actions where appropriate.

18. **THEME COLORS ONLY:** Avoid custom colors, stick to theme colors. Ask for clarification if needed.

19. **NO TECHNICAL UI:** Never show technical details to users. "Something went wrong" not "API returned 500". No toast messages with technical implementation details.

20. **THINK LIKE A REAL USER:** Give the result they want in the most concise way, with relevant/impactful information to reduce cognitive load.

### Decision Making

21. **UNBIASED OPINIONS:** Don't be an echo chamber. Disagree when appropriate with facts. Professional opinion that is fact-based.

22. **RISK ASSESSMENT:** Low risk + high reward = good. High risk + low reward = bad. Ask if unsure.

23. **IF THINGS CHANGE:** Present the issue and solutions, ask for opinion before assuming.

24. **EXPLAIN SIMPLY:** Plain English, easy examples. Non-technical explanations.

25. **VERIFY CHANGES VISIBLE:** If you make a change and user doesn't see difference, clarify and ensure working on right component. Revert if needed and ask about alternate approaches.

---

## DATABASE RULES

- **NEVER reset or wipe the database** without explicit permission
- Use migrations for schema changes
- Back up data before destructive operations

---

## OUTPUT STYLE

- Do not show thought process or file reading steps
- Only show task outcomes and concise summaries
- Give high-level summaries without showing code changes unless explicitly requested
- Make simple, incremental changes that impact minimal code
- When debugging, NEVER make assumptions - always verify
- Debugging logs must be minimal and concise with `[Module]` prefixes
- Run typecheck and lint after every change
