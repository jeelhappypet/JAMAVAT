import { Schema } from "mongoose";
import { describe, expect, it } from "vitest";
import { TenantScopeError, tenantGuard } from "@/lib/db/tenant";

/**
 * The guard is what keeps one restaurant's data out of another's: a query
 * whose filter doesn't name a restaurant must throw rather than quietly
 * read or change everything. Hooks are collected from a real schema and run
 * against a stand-in query, so no database is needed.
 */
type Hook = (this: unknown, ...args: never[]) => void;

function hooksOf(ops: string[]): Map<string, Hook> {
  const hooks = new Map<string, Hook>();
  const schema = { pre: (op: string, fn: Hook) => hooks.set(op, fn) } as unknown as Schema;
  tenantGuard(schema);
  for (const op of ops) expect(hooks.has(op)).toBe(true);
  return hooks;
}

const query = (filter: unknown, options: Record<string, unknown> = {}) => ({
  getFilter: () => filter,
  getOptions: () => options,
  model: { modelName: "Order" },
});

describe("tenant guard", () => {
  const hooks = hooksOf(["find", "findOne", "updateMany", "deleteOne", "countDocuments", "aggregate", "bulkWrite"]);

  it("refuses a query with no restaurant in its filter", () => {
    for (const op of ["find", "findOne", "updateMany", "deleteOne", "countDocuments"]) {
      expect(() => hooks.get(op)!.call(query({}))).toThrow(TenantScopeError);
      expect(() => hooks.get(op)!.call(query({ status: "PENDING" }))).toThrow(TenantScopeError);
    }
  });

  it("allows one that names a restaurant", () => {
    for (const op of ["find", "findOne", "updateMany", "deleteOne", "countDocuments"]) {
      expect(() => hooks.get(op)!.call(query({ restaurantId: "r1" }))).not.toThrow();
    }
  });

  it("allows an explicit cross-restaurant read (HQ, seat tokens)", () => {
    expect(() => hooks.get("find")!.call(query({}, { crossTenant: true }))).not.toThrow();
  });

  it("checks the first $match of an aggregate", () => {
    const agg = (match: unknown, options: Record<string, unknown> = {}) => ({ pipeline: () => [{ $match: match }], options });
    expect(() => hooks.get("aggregate")!.call(agg({}))).toThrow(TenantScopeError);
    expect(() => hooks.get("aggregate")!.call(agg({ restaurantId: "r1" }))).not.toThrow();
    expect(() => hooks.get("aggregate")!.call(agg({}, { crossTenant: true }))).not.toThrow();
  });

  it("checks every operation of a bulkWrite", () => {
    const run = (ops: unknown[]) => (hooks.get("bulkWrite") as (this: unknown, ops: unknown[]) => void).call({ modelName: "Category" }, ops);
    expect(() => run([{ updateOne: { filter: { _id: "x" }, update: {} } }])).toThrow(TenantScopeError);
    expect(() => run([{ updateOne: { filter: { restaurantId: "r1", _id: "x" }, update: {} } }])).not.toThrow();
    expect(() => run([{ insertOne: { document: { name: "Thali" } } }])).toThrow(TenantScopeError);
    expect(() => run([{ insertOne: { document: { restaurantId: "r1", name: "Thali" } } }])).not.toThrow();
  });
});
