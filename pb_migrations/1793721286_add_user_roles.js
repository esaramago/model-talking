/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.add(new SelectField({
    name: "role",
    values: ["admin", "free", "paid"],
    maxSelect: 1,
    required: false,
  }));

  app.save(users);

  // Set default role 'free' for existing users without a role
  const usersRecords = app.findAllRecords("users");
  for (const user of usersRecords) {
    if (!user.get("role")) {
      user.set("role", "free");
      app.save(user);
    }
  }

  return null;
}, (app) => {
  const users = app.findCollectionByNameOrId("users");

  users.fields.removeByName("role");

  return app.save(users);
});
