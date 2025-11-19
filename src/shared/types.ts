export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  photo: string;
}

export interface Niche {
  id: number;
  parent_id: number | null;
  name: string;
}
export interface Campaign {
  id: number;
  niche_id: number;
  title: string;
  description: string;
  max_influencers: number;
  payment_method: string;
  payment_method_label: string;
  payment_value: PaymentValue;
  benefits: string;
  objective: string;
  segments: Segments;
  rules: Rules;
  benefits_bonus: string;
  banner: string;
}

export interface PaymentValue {
  amount: number;
  currency: string;
  description: string;
}

export interface Segments {
  min_followers: number;
  location: string;
  gender: string;
  social_network: string[];
}

export interface Rules {
  do: string[];
  do_not: string[];
}

export interface Link {
  url?: string;
  label: string;
  page?: number;
  active: boolean;
}

export interface Links {
  first: string;
  last: string;
  prev: any;
  next: string;
}

export interface Meta {
  current_page: number;
  from: number;
  last_page: number;
  links: Link[];
  path: string;
  per_page: number;
  to: number;
  total: number;
}
