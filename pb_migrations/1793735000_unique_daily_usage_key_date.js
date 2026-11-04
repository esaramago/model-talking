/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("daily_usage");
  if (!collection) return null;

  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_daily_usage_key_date` ON `daily_usage` (`key`, `date`)"
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("daily_usage");
  if (!collection) return null;

  collection.indexes = [];

  return app.save(collection);
});
