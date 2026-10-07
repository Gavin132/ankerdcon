import { describe, expect, it } from "vitest";
import { activityCount, defaultCategory, FALLBACK_CATEGORY, isMealItem, mealCategory } from "./mealCategory";
import type { MealCategory } from "../types";

const cat = (over: Partial<MealCategory>): MealCategory => ({
  id: "x",
  name: "X",
  sort_order: 0,
  has_signup: true,
  has_cost: true,
  has_transport: true,
  is_meal: false,
  ...over,
});

describe("mealCategory", () => {
  it("uses the category that came with the item", () => {
    const foto = cat({ id: "f", name: "Groepsfoto", has_signup: false });
    expect(mealCategory({ category: foto })).toBe(foto);
  });

  it("treats an item without a category as the old etentje", () => {
    expect(mealCategory({})).toBe(FALLBACK_CATEGORY);
    expect(mealCategory({ category: null })).toBe(FALLBACK_CATEGORY);
    expect(FALLBACK_CATEGORY).toMatchObject({ has_signup: true, has_cost: true, has_transport: true, is_meal: true });
  });
});

describe("isMealItem", () => {
  it("is true for meals and for items with no category, false for the rest", () => {
    expect(isMealItem({ category: cat({ is_meal: true }) })).toBe(true);
    expect(isMealItem({})).toBe(true);
    expect(isMealItem({ category: cat({ is_meal: false }) })).toBe(false);
  });
});

describe("defaultCategory", () => {
  it("is the first by order, then by name", () => {
    const list = [cat({ id: "b", name: "Spel", sort_order: 3 }), cat({ id: "a", name: "Eten", sort_order: 0 }), cat({ id: "c", name: "Con", sort_order: 0 })];
    expect(defaultCategory(list).id).toBe("c");
  });

  it("falls back when there are no categories", () => {
    expect(defaultCategory([])).toBe(FALLBACK_CATEGORY);
  });
});

describe("activityCount", () => {
  it("pluralises", () => {
    expect(activityCount(1)).toBe("1 activiteit");
    expect(activityCount(0)).toBe("0 activiteiten");
    expect(activityCount(4)).toBe("4 activiteiten");
  });
});
