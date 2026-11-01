/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("talks");

  collection.fields.add(new TextField({
    name: "language",
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("talks");

  collection.fields.removeByName("language");

  return app.save(collection);
})
