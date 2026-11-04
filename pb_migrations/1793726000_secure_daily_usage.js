/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("daily_usage");
  if (!collection) return null;

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("daily_usage");
  if (!collection) return null;

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  return app.save(collection);
});
