export type Role =
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "WAITER"
  | "KITCHEN"
  | "BARTENDER"
  | "ADMIN";

export type PaymentMethod = "Cash" | "M-Pesa" | "Card" | "Bank" | "Split";
export type Station = "Kitchen" | "Bar" | "None";
export type OrderStatus = "Open" | "Sent" | "Preparing" | "Ready" | "Served" | "Paid" | "Voided";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  station: Station;
  stockTrackingType: "none" | "direct" | "recipe";
  active: boolean;
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  openingStock: number;
  sold: number;
  expected: number;
  actual: number;
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
};

export type SaleRecord = {
  receipt: string;
  time: string;
  table: string;
  cashier: string;
  total: number;
  paymentMethod: PaymentMethod;
  status: "Paid" | "Unpaid" | "Refunded" | "Voided";
};

export type TicketItem = {
  name: string;
  quantity: number;
  note?: string;
};

export type OrderTicket = {
  id: string;
  orderId?: string;
  table: string;
  waiter: string;
  station: "Kitchen" | "Bar";
  status: OrderStatus;
  age: string;
  items: TicketItem[];
};

export type StaffMember = {
  name: string;
  role: Role;
  email: string;
  status: "Active" | "Suspended";
  salesToday: number;
};
