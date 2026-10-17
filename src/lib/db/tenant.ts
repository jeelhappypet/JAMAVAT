import { Schema, Types, type Aggregate, type Query } from "mongoose";

/**
 * Data separation between restaurants. Every collection that belongs to one
 * restaurant declares `restaurantId: tenantField` and applies `tenantGuard`.
 * The guard refuses any query, update, delete, count or aggregate whose
 * filter doesn't name a restaurant — so a forgotten filter throws instead of
 * quietly reading or changing another restaurant's data. New documents can't
 * be saved without it either (`required`).
 *
 * The only way around it is the explicit `{ crossTenant: true }` query
 * option (`.setOptions(...)` / `.option(...)` on an aggregate), used by HQ
 * totals and by the lookup that upgrades a pre-tenancy session cookie.
 */
export const tenantField = { type: Schema.Types.ObjectId, ref: "Restaurant", required: true } as const;

/** Anything the session or a document hands us as a restaurant id. */
export type RestaurantRef = Types.ObjectId | string;

export class TenantScopeError extends Error {
  constructor(model: string, op: string) {
    super(`${model}.${op} has no restaurantId in its filter`);
    this.name = "TenantScopeError";
  }
}

const QUERY_OPS = [
  "countDocuments",
  "deleteMany",
  "deleteOne",
  "distinct",
  "find",
  "findOne",
  "findOneAndDelete",
  "findOneAndReplace",
  "findOneAndUpdate",
  "replaceOne",
  "updateMany",
  "updateOne",
] as const;

function names(filter: unknown): boolean {
  return !!filter && typeof filter === "object" && (filter as Record<string, unknown>).restaurantId != null;
}

export function tenantGuard(schema: Schema) {
  for (const op of QUERY_OPS) {
    schema.pre(op, function (this: Query<unknown, unknown>) {
      if ((this.getOptions() as { crossTenant?: boolean }).crossTenant) return;
      if (!names(this.getFilter())) throw new TenantScopeError(this.model.modelName, op);
    });
  }

  schema.pre("aggregate", function (this: Aggregate<unknown>) {
    if ((this.options as { crossTenant?: boolean }).crossTenant) return;
    const first = this.pipeline()[0] as { $match?: unknown } | undefined;
    if (!names(first?.$match)) throw new TenantScopeError("aggregate", "$match");
  });

  schema.pre("bulkWrite", function (this: { modelName: string }, ops: unknown[]) {
    for (const op of ops as Record<string, { filter?: unknown; document?: unknown }>[]) {
      const [kind, body] = Object.entries(op)[0] ?? [];
      if (kind === "insertOne" ? !names(body?.document) : !names(body?.filter)) {
        throw new TenantScopeError(this.modelName, `bulkWrite.${kind}`);
      }
    }
  });
}

/** For `$match` in aggregates, which (unlike find) don't cast strings to ObjectIds. */
export function toObjectId(id: RestaurantRef): Types.ObjectId {
  return typeof id === "string" ? new Types.ObjectId(id) : id;
}
