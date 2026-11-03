/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  const roleField = users.fields.getByName("role");
  if (roleField) {
    roleField.values = ["admin", "user"];
  }

  app.save(users);

  // Migrate any existing user with 'free', 'paid', or unset role to 'user'
  const userRecords = app.findAllRecords("users");
  for (const user of userRecords) {
    const role = user.get("role");
    if (role !== "admin") {
      user.set("role", "user");
      app.save(user);
    }
  }

  return null;
}, (app) => {
  const users = app.findCollectionByNameOrId("users");

  const roleField = users.fields.getByName("role");
  if (roleField) {
    roleField.values = ["admin", "free", "paid"];
  }

  app.save(users);

  const userRecords = app.findAllRecords("users");
  for (const user of userRecords) {
    if (user.get("role") === "user") {
      user.set("role", "free");
      app.save(user);
    }
  }

  return null;
});
