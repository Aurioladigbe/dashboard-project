import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import { TimerProvider, useTimer } from "./TimerContext";

function Probe({ id, seconds, callback }) {
  const { register } = useTimer();
  useEffect(() => register(id, seconds * 1000, callback), [register, id, seconds, callback]);
  return null;
}

describe("Timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("déclenche chaque widget selon son propre intervalle", () => {
    const fast = vi.fn();
    const slow = vi.fn();
    render(
      <TimerProvider>
        <Probe id="fast" seconds={5} callback={fast} />
        <Probe id="slow" seconds={20} callback={slow} />
      </TimerProvider>
    );

    vi.advanceTimersByTime(4000);
    expect(fast).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000); // t = 6 s
    expect(fast).toHaveBeenCalledTimes(1);
    expect(slow).not.toHaveBeenCalled();

    vi.advanceTimersByTime(14000); // t = 20 s
    expect(fast).toHaveBeenCalledTimes(4);
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it("arrête de rafraîchir un widget désinscrit (démonté)", () => {
    const callback = vi.fn();
    const { rerender } = render(
      <TimerProvider>
        <Probe id="a" seconds={5} callback={callback} />
      </TimerProvider>
    );
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);

    rerender(<TimerProvider />);
    vi.advanceTimersByTime(30000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ne rafraîchit rien quand l'onglet est caché", () => {
    const callback = vi.fn();
    render(
      <TimerProvider>
        <Probe id="a" seconds={5} callback={callback} />
      </TimerProvider>
    );

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    vi.advanceTimersByTime(20000);
    expect(callback).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
    hidden.mockRestore();
  });
});
