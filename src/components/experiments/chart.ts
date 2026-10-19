/**
 * Small, dependency-free helpers shared by the experiment charts. Charts are
 * server-rendered HTML/SVG: crisp at any pixel ratio, responsive, and
 * readable without JavaScript.
 *
 * Colour is a property of the execution path, not of a model: every MCP
 * route draws in the page's energy cyan, every native route in ember. A
 * per-arm override (`--series-<arm id>` in tokens.css) wins when defined, so
 * a third system can get its own tint without touching the components.
 */
import { experiments, type ArmId, type ExecutionPath } from '@data/experiments';

const pathOf = (arm: ArmId): ExecutionPath => experiments.arms[arm]?.path ?? 'native';

/** Fill colour of an arm, as a CSS variable reference (tokens.css). */
export const armFill = (arm: ArmId) => `var(--series-${arm}, var(--series-${pathOf(arm)}))`;

/** Brighter text/ink colour per arm, kept inside the two established hue families. */
export const armInk = (arm: ArmId) => `var(--ink-${arm}, var(--ink-${pathOf(arm)}))`;

/** Inline style carrying both colours, used by every chart row. */
export const armStyle = (arm: ArmId) => `--c: ${armFill(arm)}; --ink: ${armInk(arm)}`;
