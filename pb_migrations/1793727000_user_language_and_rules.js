/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new TextField({
    name: "language",
  }));

  users.fields.add(new TextField({
    name: "generalRules",
    max: 150,
  }));

  app.save(users);

  // Migrate existing data from settings JSON if available
  const userRecords = app.findAllRecords("users");
  for (const user of userRecords) {
    const settings = user.get("settings");
    let changed = false;
    if (settings && typeof settings === "object") {
      if (settings.language) {
        user.set("language", settings.language);
        changed = true;
      }
      if (settings.generalRules) {
        user.set("generalRules", settings.generalRules);
        changed = true;
      }
    }
    if (changed) {
      app.save(user);
    }
  }

  users.fields.removeByName("settings");
  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new JSONField({
    name: "settings",
  }));

  app.save(users);

  const userRecords = app.findAllRecords("users");
  for (const user of userRecords) {
    user.set("settings", {
      language: user.get("language") || "",
      generalRules: user.get("generalRules") || "",
    });
    app.save(user);
  }

  users.fields.removeByName("language");
  users.fields.removeByName("generalRules");
  return app.save(users);
});
