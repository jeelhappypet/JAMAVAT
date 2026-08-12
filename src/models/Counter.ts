import { Schema, model, models } from "mongoose";

/**
 * One document per business date. `seq` is incremented atomically to hand out
 * the next token number, so it doubles as the daily-reset mechanism — a new
 * business date simply starts a new counter document at 0.
 */
const counterSchema = new Schema({
  _id: { type: String, required: true }, // businessDate (YYYY-MM-DD, Asia/Kolkata)
  seq: { type: Number, required: true, default: 0 },
});

export const Counter = models.Counter || model("Counter", counterSchema);
