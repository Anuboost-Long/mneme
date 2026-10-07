import { desktop } from "@chain/sdk";

const INTRO_MS = 2650;

let introPlayed: Promise<void> = Promise.resolve();

function reducesMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function play(onIntroPlayed: () => void) {
  document.getElementById("launch-screen")?.setAttribute("data-shown", "");
  setTimeout(onIntroPlayed, reducesMotion() ? 0 : INTRO_MS);
}

export function playLaunchScreenWhenShown() {
  introPlayed = new Promise((resolve) => {
    const start = () => play(resolve);
    desktop.window
      .isShown()
      .then((shown) => (shown ? start() : desktop.window.onShown(start)))
      .catch(start);
  });
}

export function dismissLaunchScreen() {
  void introPlayed.then(() => {
    const screen = document.getElementById("launch-screen");
    if (!screen) return;
    if (reducesMotion()) {
      screen.remove();
      return;
    }
    screen.style.pointerEvents = "none";
    screen.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out" }).onfinish =
      () => screen.remove();
  });
}
