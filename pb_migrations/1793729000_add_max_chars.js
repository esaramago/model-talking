/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const talks = app.findCollectionByNameOrId("talks");

  users.fields.add(new NumberField({
    name: "maxChars",
    min: 100,
    max: 500,
  }));
  app.save(users);

  talks.fields.add(new NumberField({
    name: "maxChars",
    min: 100,
    max: 500,
  }));
  return app.save(talks);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  const talks = app.findCollectionByNameOrId("talks");

  users.fields.removeByName("maxChars");
  app.save(users);

  talks.fields.removeByName("maxChars");
  return app.save(talks);
});
