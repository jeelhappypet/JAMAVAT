import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Staff, type StaffDocument } from "@/models/Staff";
import { createStaffSchema } from "@/lib/validation/staff";
import { hashPin } from "@/lib/auth/pin";
import { requireStaff, toStaffDTO } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/i18n/zod";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function GET() {
  const current = await requireStaff(ROLES.admin);
  if (current instanceof NextResponse) return current;
  const t = await getTranslator();

  try {
    const staff = await Staff.find().sort({ isActive: -1, name: 1 }).lean<StaffDocument[]>();
    return NextResponse.json({ staff: staff.map(toStaffDTO) });
  } catch {
    return NextResponse.json({ error: t("err.staffLoad") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const current = await requireStaff(ROLES.admin);
  if (current instanceof NextResponse) return current;
  const t = await getTranslator();

  try {
    const { name, role, pin } = createStaffSchema.parse(await request.json());
    const created = await Staff.create({ name, role, ...(await hashPin(pin)) });
    return NextResponse.json({ staff: toStaffDTO(created.toObject()) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error, t) }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: t("err.duplicateName") }, { status: 409 });
    }
    return NextResponse.json({ error: t("err.staffAdd") }, { status: 500 });
  }
}
