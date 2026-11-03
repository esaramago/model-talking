/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "daily_usage",
    listRule: "@request.headers.x_internal_key = 'mt_server_secret_key_99812'",
    viewRule: "@request.headers.x_internal_key = 'mt_server_secret_key_99812'",
    createRule: "@request.headers.x_internal_key = 'mt_server_secret_key_99812'",
    updateRule: "@request.headers.x_internal_key = 'mt_server_secret_key_99812'",
    deleteRule: "@request.headers.x_internal_key = 'mt_server_secret_key_99812'",
    fields: [
      {
        name: "key",
        type: "text",
        required: true,
      },
      {
        name: "date",
        type: "text",
        required: true,
      },
      {
        name: "count",
        type: "number",
        required: false,
      },
    ],
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("daily_usage");
  if (collection) {
    return app.delete(collection);
  }
  return null;
});
