export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Order {
  id: string;
  table: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}
