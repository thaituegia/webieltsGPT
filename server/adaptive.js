import { diagnosticItems } from "./content.js";
// Bayesian Rasch grid update. Initial item difficulty is an instructional estimate.
export function estimate(responses, skill) {
  const rows = responses.filter((r) => r.skill === skill);
  const grid = Array.from({ length: 161 }, (_, i) => -4 + i * 0.05);
  const logs = grid.map(
    (theta) =>
      -0.5 * theta ** 2 +
      rows.reduce((sum, r) => {
        const p = 1 / (1 + Math.exp(-(theta - (r.difficulty - 5) * 0.9)));
        return sum + Math.log(r.correct ? p : 1 - p);
      }, 0),
  );
  const max = Math.max(...logs),
    weights = logs.map((x) => Math.exp(x - max)),
    total = weights.reduce((a, b) => a + b, 0);
  const mean = grid.reduce((a, t, i) => a + (t * weights[i]) / total, 0);
  const sd = Math.sqrt(
    grid.reduce((a, t, i) => a + ((t - mean) ** 2 * weights[i]) / total, 0),
  );
  return {
    count: rows.length,
    correct: rows.filter((r) => r.correct).length,
    theta: mean,
    sd,
    estimate: Math.max(3, Math.min(7, 5 + mean / 0.9)),
    range: Math.min(2, (1.96 * sd) / 0.9),
  };
}
export function nextItem(responses) {
  const skill =
    responses.filter((r) => r.skill === "Reading").length < 18
      ? "Reading"
      : "Listening";
  const e = estimate(responses, skill);
  const used = new Set(responses.map((r) => r.id));
  return diagnosticItems
    .filter((q) => q.skill === skill && !used.has(q.id))
    .sort(
      (a, b) =>
        Math.abs((a.difficulty - 5) * 0.9 - e.theta) -
        Math.abs((b.difficulty - 5) * 0.9 - e.theta),
    )[0];
}
