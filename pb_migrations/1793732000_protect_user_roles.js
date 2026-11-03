/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users) return null;

  users.createRule = "@request.body.role:isset = false || @request.body.role = 'user'";
  users.updateRule = "id = @request.auth.id && @request.body.role:isset = false";

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users) return null;

  users.createRule = "";
  users.updateRule = "id = @request.auth.id";

  return app.save(users);
});
