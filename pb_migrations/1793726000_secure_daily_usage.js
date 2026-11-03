/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("daily_usage");
  if (!collection) return null;

  const rule = "@request.headers.x_internal_key = 'mt_secret_daily_usage_key_8f3a1e'";
  collection.listRule = rule;
  collection.viewRule = rule;
  collection.createRule = rule;
  collection.updateRule = rule;
  collection.deleteRule = rule;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("daily_usage");
  if (!collection) return null;

  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "";
  collection.updateRule = "";
  collection.deleteRule = "";

  return app.save(collection);
});
