/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users) return null;

  const secretFields = [
    "twoFactorSecret",
    "twoFactorPendingSecret",
    "twoFactorEmailCode",
    "twoFactorEmailExpires",
  ];

  for (const fieldName of secretFields) {
    const field = users.fields.getByName(fieldName);
    if (field) {
      field.hidden = true;
    }
  }

  users.createRule =
    "(@request.body.role:isset = false || @request.body.role = 'user') && (@request.body.twoFactorMethod:isset = false || @request.body.twoFactorMethod = 'none') && @request.body.twoFactorSecret:isset = false && @request.body.twoFactorPendingSecret:isset = false && @request.body.twoFactorEmailCode:isset = false && @request.body.twoFactorEmailExpires:isset = false";
  users.updateRule =
    "id = @request.auth.id && @request.body.role:isset = false && @request.body.twoFactorMethod:isset = false && @request.body.twoFactorSecret:isset = false && @request.body.twoFactorPendingSecret:isset = false && @request.body.twoFactorEmailCode:isset = false && @request.body.twoFactorEmailExpires:isset = false";

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  if (!users) return null;

  const secretFields = [
    "twoFactorSecret",
    "twoFactorPendingSecret",
    "twoFactorEmailCode",
    "twoFactorEmailExpires",
  ];

  for (const fieldName of secretFields) {
    const field = users.fields.getByName(fieldName);
    if (field) {
      field.hidden = false;
    }
  }

  users.createRule = "@request.body.role:isset = false || @request.body.role = 'user'";
  users.updateRule = "id = @request.auth.id && @request.body.role:isset = false";

  return app.save(users);
});
