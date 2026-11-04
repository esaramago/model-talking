/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const talks = app.findCollectionByNameOrId("talks");

  talks.fields.add(new RelationField({
    name: "user",
    collectionId: users.id,
    cascadeDelete: true,
    maxSelect: 1,
  }));

  talks.listRule = "@request.auth.id != '' && user = @request.auth.id";
  talks.viewRule = "@request.auth.id != '' && user = @request.auth.id";
  talks.updateRule = "@request.auth.id != '' && user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)";
  talks.deleteRule = "@request.auth.id != '' && user = @request.auth.id";
  talks.createRule = "@request.auth.id != '' && user = @request.auth.id";

  app.save(talks);

  users.fields.add(new JSONField({
    name: "settings",
  }));

  return app.save(users);
}, (app) => {
  const talks = app.findCollectionByNameOrId("talks");
  const users = app.findCollectionByNameOrId("users");

  talks.fields.removeByName("user");
  talks.listRule = "";
  talks.viewRule = "";
  talks.updateRule = "";
  talks.deleteRule = "";
  talks.createRule = "";
  app.save(talks);

  users.fields.removeByName("settings");
  return app.save(users);
});
