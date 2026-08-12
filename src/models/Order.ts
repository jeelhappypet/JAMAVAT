import { Schema, model, models } from "mongoose";
import { MENU_CATEGORIES, ORDER_STATUSES } from "@/types";

const orderItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    nameSnapshot: { type: String, required: true },
    categorySnapshot: { type: String, required: true, enum: MENU_CATEGORIES },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    tokenNumber: { type: Number, required: true },
    businessDate: { type: String, required: true },
    customerName: { type: String, trim: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ORDER_STATUSES, default: "PENDING" },
    clientRequestId: { type: String },
    readyAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ businessDate: 1, status: 1 });
orderSchema.index({ businessDate: 1, tokenNumber: 1 }, { unique: true });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ clientRequestId: 1 }, { unique: true, sparse: true });

export const Order = models.Order || model("Order", orderSchema);
