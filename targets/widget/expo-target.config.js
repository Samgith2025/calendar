/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "TradingTrackerWidget",
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.samson.tradingtracker",
    ],
  },
  frameworks: ["SwiftUI", "WidgetKit"],
};
