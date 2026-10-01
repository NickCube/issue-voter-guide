# Rebuild BallotBrief around verified Somerset data

## Goal
Make the site a clear, trustworthy guide to the **June 2, 2026 Somerset County primary**. Only verified election records and source-backed candidate positions will appear publicly.

## What will change

### 1. Accuracy rules
- Treat the 31 races imported from the Somerset County Clerk roster as the public election set.
- Add explicit verification and primary fields instead of guessing from descriptive text.
- Require every published candidate position to have a working source record.
- Keep unsupported or pending records out of public pages; never invent missing positions.
- Preserve honest gaps as “No verified public position found.”

### 2. Homepage and address lookup
- Replace stale Morris County copy with Somerset County coverage and the correct primary date.
- Make “Find my ballot” the main action, with Somerset towns and ZIP suggestions.
- Match addresses to Somerset municipal, county, congressional, and statewide races.
- Replace decorative claims and counts with verified coverage totals from the database.

### 3. Races page
- Add useful search and town filters.
- Clearly label every listing as a primary and show the Democratic and Republican candidate counts separately.
- Show source-backed position coverage without implying that empty issue templates are researched positions.
- Update the election map for Somerset municipalities and remove the stale Morris geography.

### 4. Race and candidate pages
- Present Democratic and Republican contests as two distinct primary sections.
- Show filing instructions such as “Vote for one” or “Vote for two” prominently.
- Put sourced positions and evidence ahead of generic issue lists.
- Label source type, confidence, and last review date; provide a direct receipt link.
- Make missing evidence explicit and avoid unsupported closed-primary eligibility claims.

### 5. Verification and finish
- Update the methodology page to state the official-source-first standard and explain what AI may summarize but cannot verify by itself.
- Add unique page metadata for all voter-facing pages.
- Check the main voter journey on desktop and mobile: address search → race → party primary → candidate → source.
- Confirm the app builds cleanly and fix any remaining runtime errors.

## Technical details
- Add additive verification fields and database rules through a migration; update public read policies to expose only verified records.
- Mark the current Clerk-imported roster as verified during the migration, while new automated imports default to pending review.
- Centralize election labels and verification logic so the homepage, list, detail, and candidate pages cannot disagree.
- Replace Morris-only address and map datasets with Somerset County municipality data.
