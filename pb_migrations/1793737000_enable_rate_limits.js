/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const settings = app.settings();
  if (!settings) return null;

  settings.rateLimits.enabled = true;
  settings.rateLimits.rules = [
    {
      label: "users:auth",
      duration: 60,
      maxRequests: 10
    },
    {
      label: "/api/",
      duration: 1,
      maxRequests: 100
    }
  ];

  return app.save(settings);
}, (app) => {
  const settings = app.settings();
  if (!settings) return null;

  settings.rateLimits.enabled = false;
  settings.rateLimits.rules = [];

  return app.save(settings);
});
