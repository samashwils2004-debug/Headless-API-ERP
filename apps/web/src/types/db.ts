import { Generated, ColumnType } from 'kysely';

// Users/Staff Table
export interface UserTable {
  id: Generated<number>; 
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  createdAt: ColumnType<Date, string | undefined, never>;
}

// Inventory Products Table
export interface ProductTable {
  id: Generated<number>;
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
}

// Tie all tables together into a single DB map
export interface ERPDatabase {
  users: UserTable;
  products: ProductTable;
}
