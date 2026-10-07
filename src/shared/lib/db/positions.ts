import { desktop } from "@chain/sdk";

export async function savePositions(
  table: "course" | "module" | "page" | "home_widget" | "ai_action",
  ids: number[],
  first = 1
) {
  if (ids.length === 0) return;
  await desktop.storage.execute(
    `UPDATE ${table} SET position = CASE id ${ids.map(() => "WHEN ? THEN ?").join(" ")} END WHERE id IN (${ids.map(() => "?").join(", ")})`,
    [...ids.flatMap((id, index) => [id, first + index]), ...ids]
  );
}
