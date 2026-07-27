# Dynamic form example

This example models a delivery request whose active controls depend on the
selected delivery method.

```sh
npm run dev:form
```

For a step-by-step explanation, read the
[conditional form tutorial](../../docs/tutorial.md#8-scenario-model-a-conditional-form).

## ECS model

Every field is an entity with:

- `FormField` for passive label/control metadata;
- `FieldValue` for its preserved value;
- `ActiveField` when it belongs to the current structure;
- optional `DeliveryBranch` and `FieldError` components.

The delivery method system adds or removes `ActiveField` from courier and
pickup branch entities. Branch values remain in `FieldValue`, so switching back
restores the user's input.

The submit system queries only `FormField + FieldValue + ActiveField`.
Inactive values are neither validated nor included in the `FormSubmission`
component. React simply renders that query and translates control changes into
system inputs.

This example creates one form per world. Supporting multiple forms in one
world requires an ownership component on field entities.
