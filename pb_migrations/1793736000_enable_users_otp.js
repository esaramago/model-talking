/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users) return null;

  users.otp.enabled = true;
  users.otp.duration = 600; // 10 minutes
  users.otp.length = 6;

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users) return null;

  users.otp.enabled = false;

  return app.save(users);
});
