/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "daily_usage",
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
