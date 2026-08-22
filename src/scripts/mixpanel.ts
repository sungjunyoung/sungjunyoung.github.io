import mixpanel from "mixpanel-browser";
import { SITE } from "../consts";

mixpanel.init(SITE.mixpanelToken, {
  autocapture: true,
  track_pageview: true,
});
