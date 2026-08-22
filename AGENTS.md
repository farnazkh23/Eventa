# Eventa project guidance

Eventa is a mobile-first, AI-assisted event and catering planner for Transgourmet.

## Source of truth

- Before UI work, inspect every image in `docs/design-reference/` at full resolution.
- Treat those references as authoritative for visual hierarchy, spacing, surfaces, controls, and flow. Do not introduce a competing design system.
- Preserve the lowercase `eventa.` wordmark with the small `by Transgourmet` endorsement.

## Product and design rules

- Design mobile-first; enhance wider screens without turning the experience into a desktop dashboard.
- Keep screens minimal and quickly scannable, with one dominant decision or action per screen.
- Use a mostly white/neutral palette, dark blue-gray text, cool gray secondary text, and Transgourmet-inspired red as the primary accent. Reserve semantic colors for status.
- Follow the references: generous whitespace, large rounded containers, subtle borders/shadows, thin outline icons, clear progress, and prominent full-width primary actions.
- Prefer text, icons, quantities, and summaries. Avoid image-heavy food catalogues; use real food/product photography only when it adds decision value.
- Build reusable primitives and shared design tokens; avoid page-specific styling drift.
- Keep copy plain, concise, and sentence case. Make loading, empty, validation, error, and success states intentional.
- Meet WCAG AA basics: semantic HTML, keyboard access, visible focus, adequate contrast, touch targets of at least 44px, and reduced-motion support.
- QR visitors must be able to complete the prototype flow without authentication. Login may only be optional and outside the critical path.

## Engineering rules

- Use React and TypeScript with strict type checking and a lightweight feature-based architecture.
- Keep state local by default. Add dependencies or global state only when a demonstrated need outweighs the complexity.
- Separate domain data and AI/service adapters from presentation components. Mock external services behind typed interfaces for the prototype.
- Test the critical guest flow and core calculation/domain logic. Run formatting, linting, type checks, and relevant tests before handoff.
- Never commit secrets or personal data. Use environment variables and provide safe example configuration.

## Working agreement

- Keep hackathon changes small, reviewable, and directly tied to the current phase.
- Do not add application code or major dependencies until the proposed stack and implementation phase are approved.
