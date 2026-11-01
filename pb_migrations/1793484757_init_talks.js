/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "talks",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
      },
      {
        name: "initialTopic",
        type: "text",
      },
      {
        name: "messages",
        type: "json",
      },
      {
        name: "agent1Name",
        type: "text",
      },
      {
        name: "agent2Name",
        type: "text",
      },
      {
        name: "systemPrompt1",
        type: "text",
      },
      {
        name: "systemPrompt2",
        type: "text",
      },
      {
        name: "generalRules",
        type: "text",
      },
      {
        name: "model",
        type: "text",
      },
      {
        name: "maxTurns",
        type: "number",
      },
      {
        name: "maxTokens",
        type: "number",
      },
      {
        name: "totalTokens",
        type: "number",
      },
      {
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false,
      },
      {
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true,
      },
    ]
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("talks");
  return app.delete(collection);
})
