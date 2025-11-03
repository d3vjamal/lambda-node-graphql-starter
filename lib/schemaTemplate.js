import dedent from 'dedent';

export function getBaseSchema() {
  return dedent`
    schema {
      query: Query
      mutation: Mutation
    }

    type Query
    type Mutation

    type ResponseDetail {
      status: String!
      statusCode: Int!
      message: String!
      friendlyMessage: String
    }
  `.trim() + '\n'
}