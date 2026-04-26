import type { LineageDataType } from "infinibrowser";

export function validateLineageCraftingOrder(lineage: LineageDataType) {
  const discovered = new Set<string>(["Earth", "Fire", "Water", "Wind"]); // Base elements

  for (let i = 0; i < lineage.steps.length; i++) {
    const step = lineage.steps[i]!;
    const a = step.a.id;
    const b = step.b.id;
    const result = step.result.id;

    if (!discovered.has(a)) {
      return {
        valid_order: false,
        invalid_element: a,
        invalid_step: i + 1,
      } as const;
    }

    if (!discovered.has(b)) {
      return {
        valid_order: false,
        invalid_element: b,
        invalid_step: i + 1,
      } as const;
    }

    discovered.add(result);
  }

  return { valid_order: true } as const;
}
