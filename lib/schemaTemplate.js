import dedent from 'dedent';

// Base SDL shared by every generated schema. AppSync infers the Query/Mutation
// root types by name, so no `schema { ... }` block is emitted here — the
// Query/Mutation types themselves are appended by the schema builder.
export function getBaseSchema() {
  return (
    dedent`
    # ── Shared Types ──
    type ResponseDetail {
      status: String!
      statusCode: Int!
      message: String!
      friendlyMessage: String
    }
  `.trim() + '\n'
  );
}
