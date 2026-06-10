import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RestaurantSettings = {
  restaurantName: string;
  receiptSubtitle: string;
  receiptFooter: string;
  phone: string;
  address: string;
  taxRate: number;
  defaultServiceCharge: number;
};

const defaults: RestaurantSettings = {
  restaurantName: "Jikon Grill",
  receiptSubtitle: "Restaurant and Bar",
  receiptFooter: "Thank you for dining with us.",
  phone: "",
  address: "",
  taxRate: 16,
  defaultServiceCharge: 0
};

const settingKeys = Object.keys(defaults) as Array<keyof RestaurantSettings>;

export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: settingKeys
      }
    }
  });
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    restaurantName: values.get("restaurantName") ?? defaults.restaurantName,
    receiptSubtitle: values.get("receiptSubtitle") ?? defaults.receiptSubtitle,
    receiptFooter: values.get("receiptFooter") ?? defaults.receiptFooter,
    phone: values.get("phone") ?? defaults.phone,
    address: values.get("address") ?? defaults.address,
    taxRate: toNumber(values.get("taxRate"), defaults.taxRate),
    defaultServiceCharge: toNumber(values.get("defaultServiceCharge"), defaults.defaultServiceCharge)
  };
}

export async function saveRestaurantSettings(settings: RestaurantSettings, tx: Prisma.TransactionClient = prisma) {
  await Promise.all(
    settingKeys.map((key) =>
      tx.appSetting.upsert({
        where: { key },
        update: { value: String(settings[key]) },
        create: { key, value: String(settings[key]) }
      })
    )
  );
}

export function parseRestaurantSettings(formData: FormData): RestaurantSettings {
  return {
    restaurantName: cleanText(formData.get("restaurantName"), defaults.restaurantName),
    receiptSubtitle: cleanText(formData.get("receiptSubtitle"), defaults.receiptSubtitle),
    receiptFooter: cleanText(formData.get("receiptFooter"), defaults.receiptFooter),
    phone: cleanText(formData.get("phone"), defaults.phone),
    address: cleanText(formData.get("address"), defaults.address),
    taxRate: clamp(toNumber(formData.get("taxRate"), defaults.taxRate), 0, 100),
    defaultServiceCharge: Math.max(toNumber(formData.get("defaultServiceCharge"), defaults.defaultServiceCharge), 0)
  };
}

function cleanText(value: FormDataEntryValue | null, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
