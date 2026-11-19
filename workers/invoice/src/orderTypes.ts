// ইনভয়েস রেন্ডারের জন্য দরকারি Order টাইপ — মূল সাইটের types/index.ts থেকে হুবহু কপি (এই Worker আলাদা প্রজেক্ট, '@/types' পায় না)।
// মূল সাইটে Order-এর এই ফিল্ডগুলো বদলালে এখানেও মিলিয়ে বদলান।
export interface OrderItem {
  name: string;
  price: number;
  qty: number;
  imgs?: string[];
}

export interface OrderCustomer {
  name?: string;
  phone?: string;
  district?: string;
  address?: string;
  email?: string;
}

export interface Order {
  id: string | number;
  orderNum: string | number;
  date: string;
  customer: OrderCustomer;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  shippingCost?: number;
  shipping?: string;
  advancePaid?: number;
  couponCode?: string;
  discountAmount?: number;
}
