import mixpanel from "mixpanel-browser";
import { SITE } from "../consts";

// Initialised once for the whole session rather than per page: with
// `autocapture` on, mixpanel patches history.pushState and re-tracks a
// pageview whenever the URL changes, which is exactly what <ClientRouter />
// does on every navigation. Calling track_pageview from `astro:page-load` as
// well would count each SPA navigation twice.
//
// (`track_pageview` below is the pre-autocapture spelling of the same switch;
// mixpanel ignores it while `autocapture` is truthy, and the autocapture
// default — track on any full-URL change — is what actually applies.)
mixpanel.init(SITE.mixpanelToken, {
  autocapture: true,
  track_pageview: true,
});
