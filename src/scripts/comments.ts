import { THEME_CHANGE_EVENT, currentTheme } from "./theme";

const UTTERANCES_ORIGIN = "https://utteranc.es";

const utterancesTheme = () =>
  currentTheme() === "dark" ? "photon-dark" : "github-light";

const container = document.querySelector<HTMLElement>(".comments");

if (container && !container.querySelector("script")) {
  const script = document.createElement("script");
  script.src = `${UTTERANCES_ORIGIN}/client.js`;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("repo", container.dataset.utterancesRepo ?? "");
  script.setAttribute("issue-term", "pathname");
  script.setAttribute("label", "💬");
  script.setAttribute("theme", utterancesTheme());
  container.appendChild(script);

  // The widget lives in a cross-origin iframe, so the only way to restyle it
  // after load is to post it a message.
  const pushTheme = () => {
    const frame = container.querySelector<HTMLIFrameElement>("iframe");
    frame?.contentWindow?.postMessage(
      { type: "set-theme", theme: utterancesTheme() },
      UTTERANCES_ORIGIN,
    );
  };

  document.addEventListener(THEME_CHANGE_EVENT, pushTheme);
  window.addEventListener("storage", pushTheme);
}
