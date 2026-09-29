import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAnimatedNumber } from "./useAnimatedNumber";

describe("useAnimatedNumber", () => {
  it("affiche la valeur réelle dès le premier rendu (pas de compteur depuis zéro)", () => {
    const { result } = renderHook(() => useAnimatedNumber(26.6));
    expect(result.current).toBe(26.6);
  });

  it("accepte l'absence de valeur", () => {
    const { result } = renderHook(() => useAnimatedNumber(null));
    expect(result.current).toBeNull();
  });
});
