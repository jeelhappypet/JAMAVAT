import { Schema, model, models } from "mongoose";
import { ORDER_ITEM_STATUSES, ORDER_SOURCES, ORDER_STATUSES } from "@/types";

const orderItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
    nameSnapshot: { type: String, required: true },
    nameGuSnapshot: { type: String },
    /** Routes the item to kitchen screens. Missing on v1 orders (those show on every screen). */
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    categorySnapshot: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    /** Each kitchen marks only its own items; the order is READY when none are PENDING. */
    status: { type: String, enum: ORDER_ITEM_STATUSES, default: "PENDING" },
    readyAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    tokenNumber: { type: Number, required: true },
    businessDate: { type: String, required: true },
    customerName: { type: String, trim: true },
    source: { type: String, enum: ORDER_SOURCES, default: "COUNTER" },
    seatId: { type: Schema.Types.ObjectId, ref: "Seat" },
    seatCode: { type: String },
    guestSessionId: { type: Schema.Types.ObjectId, ref: "GuestSession" },
    guestEmail: { type: String, lowercase: true, trim: true },
    note: { type: String, trim: true, maxlength: 200 },
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
orderSchema.index({ guestSessionId: 1 });

export const Order = models.Order || model("Order", orderSchema);
