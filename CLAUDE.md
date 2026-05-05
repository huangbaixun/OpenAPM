# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **Claude Design (claude.ai/design) handoff bundle**, not a production app. The user mocked up an APM (Application Performance Monitoring) UI called "啄木鸟 APM 2.0" in HTML/CSS/JS, then exported the bundle so a coding agent can recreate the design in a real codebase. See `README.md` — your job is to **recreate the visuals pixel-perfectly** in whatever stack the target project uses; do not copy the prototype's internal structure unless it happens to fit.

There is no build system, no package manager, no tests, no lint. The "run" step is just opening the HTML in a browser. Per the README, **don't render in a browser or take screenshots unless the user asks** — read the HTML/CSS source directly for dimensions, colors, and layout rules.

The `README.md` references `apm/project/...` paths, but in this checkout the prototype lives at the repository root.

## The primary design

`啄木鸟 APM 2.0.html` (Chinese filename — quote it in shell) is the entry point the user had open at handoff. It is the modular version: a thin shell that loads `styles/*.css` and `js/*.js`. Read it first, then follow its imports.

`v1-base.html` is an older single-file version of the same prototype (inline CSS/JS). Treat it as historical reference; the modular files are canonical.

`uploads/apm-prototype.html` is another self-contained snapshot.

## Architecture

Single-page app with no framework. Everything hangs off a global `APM` object.

**Boot path** (`js/app.js`): on `DOMContentLoaded`, calls `APM.renderTopbar()`, `APM.renderSidebar()`, `APM.renderPage()`. Script load order in the HTML matters — `data.js` defines `window.APM` and seeds state, then `shell.js` adds rendering/routing, then each `pages-*.js` attaches its page renderer onto `APM`.

**Routing** (`js/shell.js`): `APM.go(pageId, params)` sets `APM.currentPage` and re-renders. `APM.renderPage()` dispatches via a `renderers` map (`overview`, `service`, `traces`, `logs`, `topology`, `alerts`, `exceptions`, `dashboards`, `onboarding`, `database`, `llm`, `settings`). Each renderer is a function that returns an HTML string; the result is injected into `<main id="main">`. Unknown pages fall through to `APM.placeholderPage`. After-render hooks run via `APM.afterRender` (one-shot, cleared each render).

**Page modules** (`js/pages-*.js`): each defines `APM.render<PageName> = function() { return '...html...' }`. `pages-extras.js` wraps some earlier renderers (e.g. `APM._renderDashboardsList = APM.renderDashboards; APM.renderDashboards = ...`) to add drill-in views — be aware this monkey-patching exists when tracing behavior.

**State**: plain mutable globals on `APM` (`currentDomain`, `currentProject`, `currentPage`, `dashView`, etc.). Mutating state then calling `APM.renderPage()` / `APM.renderTopbar()` / `APM.renderSidebar()` is the update pattern.

**Mock data** (`js/data.js`): all displayed numbers are seeded fixtures — domains/projects (tenant hierarchy), services, alerts, exceptions, slow SQL queries, endpoints, logs (generated procedurally with timestamps), traces. `APM.health(svc)` and `APM.healthColor(h)` are the shared status helpers. `APM.activeAlertCount` is computed once at load.

**Styles** (`styles/`): split into `core.css` (design tokens, layout grid, topbar/sidebar shell), `components.css` (reusable bits — pills, dropdowns, badges), `pages.css` (page-specific). Theming uses CSS custom properties keyed off `:root[data-theme="light|dark"]`; `APM.toggleTheme()` flips the attribute. Design language is "Apple HIG inspired, glass" — translucent surfaces, SF font stack, `--accent: #0071e3`.

**Charts**: hand-rolled inline SVG. `APM.sparkline(values, color, w, h)` in `shell.js` is the small-chart helper; larger pages define their own `sparkBig` / `line` helpers locally. There is no charting library.

**Icons**: inline SVG strings on `APM.svgI` and inside nav definitions — no icon font, no sprite sheet.

## When implementing the design in a real codebase

- Source of truth for visual specs is the CSS custom properties in `styles/core.css` and the per-component rules in `components.css` / `pages.css`. Pull tokens from there rather than eyeballing.
- The HTML structure in render functions is template-string concatenation with inline `onclick` handlers — that's a prototype convenience, not a pattern to port. Map to the target framework's idioms (components, event binding, state) and only preserve the *visual* output.
- Page content is bilingual (Chinese + English labels, e.g. "调用链 Traces"). Preserve both unless the user says otherwise.
- The viewport is fixed at `width=1440` — these are desktop-only mocks; do not assume responsive behavior is specified.
