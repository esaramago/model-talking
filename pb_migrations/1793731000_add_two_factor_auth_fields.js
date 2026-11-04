/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new TextField({
    name: "twoFactorSecret",
    hidden: true,
  }));

  users.fields.add(new TextField({
    name: "twoFactorPendingSecret",
    hidden: true,
  }));

  users.fields.add(new TextField({
    name: "twoFactorEmailCode",
    hidden: true,
  }));

  users.fields.add(new NumberField({
    name: "twoFactorEmailExpires",
    hidden: true,
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
