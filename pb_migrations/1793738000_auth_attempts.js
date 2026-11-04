/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "auth_attempts",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        name: "key",
        type: "text",
        required: true,
      },
      {
        name: "count",
        type: "number",
        required: true,
      },
      {
        name: "expiresAt",
        type: "number",
        required: true,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_auth_attempts_key` ON `auth_attempts` (`key`)",
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("auth_attempts");
  if (collection) {
    return app.delete(collection);
  }
  return null;
});
