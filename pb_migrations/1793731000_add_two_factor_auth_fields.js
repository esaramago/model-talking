/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new TextField({
    name: "twoFactorSecret",
  }));

  users.fields.add(new TextField({
    name: "twoFactorPendingSecret",
  }));

  users.fields.add(new TextField({
    name: "twoFactorEmailCode",
  }));

  users.fields.add(new NumberField({
    name: "twoFactorEmailExpires",
  }));

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.removeByName("twoFactorSecret");
  users.fields.removeByName("twoFactorPendingSecret");
  users.fields.removeByName("twoFactorEmailCode");
  users.fields.removeByName("twoFactorEmailExpires");

  return app.save(users);
});
