/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new SelectField({
    name: "twoFactorMethod",
    values: ["none", "email", "authenticator"],
    maxSelect: 1,
    required: false,
  }));

  app.save(users);

  const userRecords = app.findAllRecords("users");
  for (const user of userRecords) {
    if (!user.get("twoFactorMethod")) {
      user.set("twoFactorMethod", "none");
      app.save(user);
    }
  }

  return null;
}, (app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.removeByName("twoFactorMethod");

  return app.save(users);
});
