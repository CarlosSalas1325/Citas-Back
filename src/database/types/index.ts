export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PROFESIONAL = 'PROFESIONAL',
  RECEPCIONISTA = 'RECEPCIONISTA',
  PACIENTE = 'PACIENTE',
  CLIENTE = 'CLIENTE',
}

export enum AppointmentStatus {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum BusinessType {
  ODONTOLOGIA = 'ODONTOLOGIA',
  MANICURISTA = 'MANICURISTA',
  GENERAL = 'GENERAL',
}

export interface IBusiness {
  id: string;
  name: string;
  type: BusinessType;
  slug: string;
  phone: string;
  address: string;
  logo_url?: string;
  /** Free trial deadline set at signup; past it, access needs an active subscription. */
  trial_ends_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IUser {
  id: string;
  business_id: string;
  name: string;
  // Null only for Google users who have not completed their profile yet (migration 013).
  phone: string | null;
  // Null for Google-only accounts — they authenticate through Google, never a password.
  password: string | null;
  email?: string | null;
  google_id?: string | null;
  avatar_url?: string | null;
  role: Role;
  is_verified: boolean;
  refresh_token?: string | null;
  otp_code?: string | null;
  otp_expires_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IService {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  is_active: boolean;
  created_at: Date;
}

export interface IProduct {
  id: string;
  business_id: string;
  name: string;
  description: string;
  stock: number;
  unit: string;
  price: number;
  min_stock: number;
  is_active: boolean;
  created_at: Date;
}

export interface IServiceProduct {
  id: string;
  service_id: string;
  product_id: string;
  quantity_used: number;
}

export interface IAppointment {
  id: string;
  business_id: string;
  patient_id: string;
  professional_id: string;
  service_id: string;
  date_time: Date;
  status: AppointmentStatus;
  total_price: number;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IAppointmentProduct {
  id: string;
  appointment_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface IPortfolio {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  image_url: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IBusinessSchedule {
  id: string;
  business_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
