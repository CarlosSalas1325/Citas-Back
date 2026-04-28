-- =============================================================
--  SISTEMA DE CITAS — Schema + Seed para Supabase
--  Ejecutar en: Supabase > SQL Editor
--  Contraseña demo para todos los usuarios: 123456
-- =============================================================

-- ─────────────────────────────────────────
-- EXTENSIONES
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────
-- 001: businesses
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR NOT NULL,
  type       VARCHAR NOT NULL CHECK (type IN ('ODONTOLOGIA', 'MANICURISTA', 'GENERAL')),
  phone      VARCHAR NOT NULL,
  address    VARCHAR NOT NULL,
  logo_url   VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────
-- 002: users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            VARCHAR NOT NULL,
  phone           VARCHAR NOT NULL,
  password        VARCHAR NOT NULL,
  role            VARCHAR NOT NULL DEFAULT 'CLIENTE'
                    CHECK (role IN ('SUPER_ADMIN','ADMIN','PROFESIONAL','RECEPCIONISTA','PACIENTE','CLIENTE')),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  refresh_token   VARCHAR,
  otp_code        VARCHAR,
  otp_expires_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);


-- ─────────────────────────────────────────
-- 003: services
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        VARCHAR NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       DECIMAL(10,2) NOT NULL,
  duration    INTEGER NOT NULL,        -- minutos
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);


-- ─────────────────────────────────────────
-- 004: products
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        VARCHAR NOT NULL,
  description TEXT,
  stock       INTEGER NOT NULL DEFAULT 0,
  unit        VARCHAR NOT NULL DEFAULT 'piezas',
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock   INTEGER NOT NULL DEFAULT 5,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);


-- ─────────────────────────────────────────
-- 005: service_products
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_used FLOAT NOT NULL DEFAULT 1,
  UNIQUE (service_id, product_id)
);


-- ─────────────────────────────────────────
-- 006: appointments
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status          VARCHAR NOT NULL DEFAULT 'PENDIENTE'
                    CHECK (status IN ('PENDIENTE','CONFIRMADA','COMPLETADA','CANCELADA')),
  date_time       TIMESTAMPTZ NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date   ON appointments(business_id, date_time);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id     ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id      ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);


-- ─────────────────────────────────────────
-- 007: appointment_products
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_products (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity       FLOAT NOT NULL DEFAULT 1,
  unit_price     DECIMAL(10,2) NOT NULL DEFAULT 0
);


-- ─────────────────────────────────────────
-- 008: businesses.slug
-- ─────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE;


-- ─────────────────────────────────────────
-- 009: portfolio
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR NOT NULL,
  description TEXT,
  image_url   VARCHAR NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────
-- 010: business_schedules
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,   -- 0=Domingo … 6=Sábado
  open_time   TIME NOT NULL,
  close_time  TIME NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, day_of_week)
);


-- =============================================================
-- SEED — Datos de demostración
-- Contraseña de todos los usuarios: 123456
-- =============================================================

DO $$
DECLARE
  -- businesses
  dental_id   UUID := uuid_generate_v4();
  nails_id    UUID := uuid_generate_v4();

  -- users dental
  dental_admin_id  UUID := uuid_generate_v4();
  dentist1_id      UUID := uuid_generate_v4();
  dentist2_id      UUID := uuid_generate_v4();
  recep1_id        UUID := uuid_generate_v4();
  patient1_id      UUID := uuid_generate_v4();
  patient2_id      UUID := uuid_generate_v4();

  -- users nails
  nails_admin_id   UUID := uuid_generate_v4();
  manicurista1_id  UUID := uuid_generate_v4();
  nail_patient1_id UUID := uuid_generate_v4();
  nail_patient2_id UUID := uuid_generate_v4();

  -- products dental
  resina_id      UUID := uuid_generate_v4();
  anestesia_id   UUID := uuid_generate_v4();
  guantes_d_id   UUID := uuid_generate_v4();
  fluoruro_id    UUID := uuid_generate_v4();
  pasta_id       UUID := uuid_generate_v4();

  -- products nails
  esmalte_id     UUID := uuid_generate_v4();
  acrilico_id    UUID := uuid_generate_v4();
  acetona_id     UUID := uuid_generate_v4();
  limas_id       UUID := uuid_generate_v4();

  -- services dental
  limpieza_id      UUID := uuid_generate_v4();
  obturacion_id    UUID := uuid_generate_v4();
  extraccion_id    UUID := uuid_generate_v4();
  blanqueam_id     UUID := uuid_generate_v4();

  -- services nails
  manicure_id      UUID := uuid_generate_v4();
  esculpidas_id    UUID := uuid_generate_v4();
  remocion_id      UUID := uuid_generate_v4();

  pwd  TEXT := '$2b$10$qPLWq/EZ/PHTRV4XVgNpI.WQH4eRBp/HxH3TBBz1/stHtK3e7IEbK';
  hoy  DATE := CURRENT_DATE;
BEGIN

  -- ── BUSINESSES ──────────────────────────────────────────────
  INSERT INTO businesses (id, name, type, slug, phone, address) VALUES
    (dental_id, 'Clínica Dental Sonrisa', 'ODONTOLOGIA', 'clinica-dental-sonrisa', '5551234567', 'Av. Principal 123, Ciudad'),
    (nails_id,  'Nails Studio Express',   'MANICURISTA',  'nails-studio-express',  '5552234567', 'Centro Comercial Plaza, Local 45');


  -- ── USERS — DENTAL ──────────────────────────────────────────
  INSERT INTO users (id, business_id, name, phone, password, role, is_verified) VALUES
    (dental_admin_id, dental_id, 'Admin Dental',       '5551000001', pwd, 'ADMIN',        TRUE),
    (dentist1_id,     dental_id, 'Dra. María López',   '5551000002', pwd, 'PROFESIONAL',  TRUE),
    (dentist2_id,     dental_id, 'Dr. Juan Pérez',     '5551000003', pwd, 'PROFESIONAL',  TRUE),
    (recep1_id,       dental_id, 'Ana Recepción',      '5551000004', pwd, 'RECEPCIONISTA', TRUE),
    (patient1_id,     dental_id, 'Carlos Paciente',    '5551000005', pwd, 'PACIENTE',     TRUE),
    (patient2_id,     dental_id, 'Laura Paciente',     '5551000006', pwd, 'PACIENTE',     TRUE);


  -- ── USERS — NAILS ───────────────────────────────────────────
  INSERT INTO users (id, business_id, name, phone, password, role, is_verified) VALUES
    (nails_admin_id,   nails_id, 'Admin Nails',       '5552000001', pwd, 'ADMIN',       TRUE),
    (manicurista1_id,  nails_id, 'Sandra Estilista',  '5552000002', pwd, 'PROFESIONAL', TRUE),
    (nail_patient1_id, nails_id, 'Fernanda Cliente',  '5552000003', pwd, 'PACIENTE',    TRUE),
    (nail_patient2_id, nails_id, 'Gabriela Cliente',  '5552000004', pwd, 'PACIENTE',    TRUE);


  -- ── PRODUCTS — DENTAL ───────────────────────────────────────
  INSERT INTO products (id, business_id, name, description, price, stock, min_stock, unit) VALUES
    (resina_id,    dental_id, 'Resina compuesta A2',  'Resina compuesta shade A2 jeringa 4g',   45.00,  50, 10, 'jeringa'),
    (anestesia_id, dental_id, 'Anestesia Lidocaína',  'Carpule de anestesia lidocaína 2%',      12.00, 100, 20, 'carpule'),
    (guantes_d_id, dental_id, 'Guantes látex',        'Guantes desechables talla M',             0.50, 500,100, 'par'),
    (fluoruro_id,  dental_id, 'Flúor en gel',         'Gel de fluoruro de sodio 1.23%',         25.00,  15,  5, 'frasco'),
    (pasta_id,     dental_id, 'Pasta profiláctica',   'Pasta para pulido dental sabor menta',   18.00,   8,  5, 'frasco');


  -- ── PRODUCTS — NAILS ────────────────────────────────────────
  INSERT INTO products (id, business_id, name, description, price, stock, min_stock, unit) VALUES
    (esmalte_id,  nails_id, 'Esmalte gel rojo',    'Esmalte gel semi permanente rojo',     15.00, 30, 5, 'frasco'),
    (acrilico_id, nails_id, 'Polvo acrílico rosa', 'Polvo acrílico para esculpido',        35.00, 20, 5, 'frasco'),
    (acetona_id,  nails_id, 'Acetona pura',        'Acetona para remoción de esmalte',      8.00,  3, 5, 'litro'),
    (limas_id,    nails_id, 'Lima 180/240',        'Lima media/fina para uñas',             2.00,100,20, 'pieza');


  -- ── SERVICES — DENTAL ───────────────────────────────────────
  INSERT INTO services (id, business_id, name, description, price, duration) VALUES
    (limpieza_id,   dental_id, 'Limpieza dental',      'Limpieza profunda con ultrasonido y pulido',  80.00, 45),
    (obturacion_id, dental_id, 'Obturación (relleno)', 'Restauración con resina compuesta',          120.00, 60),
    (extraccion_id, dental_id, 'Extracción simple',    'Extracción de pieza dental sin complicaciones', 90.00, 30),
    (blanqueam_id,  dental_id, 'Blanqueamiento',       'Blanqueamiento dental con gel peróxido',     250.00, 90);


  -- ── SERVICES — NAILS ────────────────────────────────────────
  INSERT INTO services (id, business_id, name, description, price, duration) VALUES
    (manicure_id,   nails_id, 'Manicure gel',     'Aplicación de esmalte semi permanente',  45.00, 45),
    (esculpidas_id, nails_id, 'Uñas esculpidas',  'Esculpido acrílico con diseño',          80.00, 90),
    (remocion_id,   nails_id, 'Remoción',         'Remoción de esmalte gel o acrílico',     20.00, 20);


  -- ── SERVICE PRODUCTS — DENTAL ───────────────────────────────
  INSERT INTO service_products (service_id, product_id, quantity_used) VALUES
    (limpieza_id,   pasta_id,     1),
    (limpieza_id,   guantes_d_id, 1),
    (limpieza_id,   fluoruro_id,  1),
    (obturacion_id, resina_id,    1),
    (obturacion_id, anestesia_id, 2),
    (obturacion_id, guantes_d_id, 2),
    (extraccion_id, anestesia_id, 3),
    (extraccion_id, guantes_d_id, 2);


  -- ── SERVICE PRODUCTS — NAILS ────────────────────────────────
  INSERT INTO service_products (service_id, product_id, quantity_used) VALUES
    (manicure_id,   esmalte_id,  1),
    (manicure_id,   limas_id,    1),
    (esculpidas_id, acrilico_id, 1),
    (esculpidas_id, limas_id,    2),
    (remocion_id,   acetona_id,  1),
    (remocion_id,   limas_id,    1);


  -- ── APPOINTMENTS — DENTAL ───────────────────────────────────
  INSERT INTO appointments (business_id, patient_id, professional_id, service_id, date_time, status, total_price, notes) VALUES
    (dental_id, patient1_id, dentist1_id, limpieza_id,   (hoy || 'T09:00:00')::TIMESTAMPTZ, 'CONFIRMADA', 80.00,  'Paciente regular, control semestral'),
    (dental_id, patient2_id, dentist1_id, obturacion_id, (hoy || 'T10:30:00')::TIMESTAMPTZ, 'PENDIENTE',  120.00, NULL),
    (dental_id, patient1_id, dentist2_id, extraccion_id, (hoy || 'T11:00:00')::TIMESTAMPTZ, 'PENDIENTE',  90.00,  'Molar superior derecho'),
    (dental_id, patient2_id, dentist2_id, blanqueam_id,  (hoy || 'T14:00:00')::TIMESTAMPTZ, 'PENDIENTE',  250.00, NULL);


  -- ── APPOINTMENTS — NAILS ────────────────────────────────────
  INSERT INTO appointments (business_id, patient_id, professional_id, service_id, date_time, status, total_price, notes) VALUES
    (nails_id, nail_patient1_id, manicurista1_id, manicure_id,   (hoy || 'T10:00:00')::TIMESTAMPTZ, 'CONFIRMADA', 45.00, NULL),
    (nails_id, nail_patient2_id, manicurista1_id, esculpidas_id, (hoy || 'T11:00:00')::TIMESTAMPTZ, 'PENDIENTE',  80.00, 'Diseño francés con glitter');


  -- ── PORTFOLIO ───────────────────────────────────────────────
  INSERT INTO portfolio (business_id, user_id, title, description, image_url, is_active) VALUES
    (dental_id, dentist1_id,    'Blanqueamiento láser',    'Resultado de blanqueamiento con láser en una sesión',    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600', TRUE),
    (dental_id, dentist2_id,    'Carillas de porcelana',   'Colocación de carillas en sector anterior',              'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600', TRUE),
    (dental_id, dentist1_id,    'Ortodoncia invisible',    'Caso completado con alineadores transparentes',          'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600', TRUE),
    (nails_id,  manicurista1_id,'Diseño francés elegante', 'Uñas esculpidas con diseño francés y glitter',          'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600', TRUE),
    (nails_id,  manicurista1_id,'Nail art tropical',       'Diseño personalizado con motivos tropicales',            'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600', TRUE),
    (nails_id,  manicurista1_id,'Acrílico efecto mármol',  'Uñas esculpidas con técnica de mármol',                 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=600', TRUE);


  -- ── BUSINESS SCHEDULES — DENTAL (Lun-Vie 08:00-17:00) ──────
  INSERT INTO business_schedules (business_id, day_of_week, open_time, close_time, is_active) VALUES
    (dental_id, 1, '08:00', '17:00', TRUE),
    (dental_id, 2, '08:00', '17:00', TRUE),
    (dental_id, 3, '08:00', '17:00', TRUE),
    (dental_id, 4, '08:00', '17:00', TRUE),
    (dental_id, 5, '08:00', '17:00', TRUE);


  -- ── BUSINESS SCHEDULES — NAILS (Lun-Sáb 09:00-19:00) ──────
  INSERT INTO business_schedules (business_id, day_of_week, open_time, close_time, is_active) VALUES
    (nails_id, 1, '09:00', '19:00', TRUE),
    (nails_id, 2, '09:00', '19:00', TRUE),
    (nails_id, 3, '09:00', '19:00', TRUE),
    (nails_id, 4, '09:00', '19:00', TRUE),
    (nails_id, 5, '09:00', '19:00', TRUE),
    (nails_id, 6, '09:00', '19:00', TRUE);

END $$;


-- =============================================================
-- CREDENCIALES DE PRUEBA (contraseña: 123456)
-- ─────────────────────────────────────────────────────────────
-- Clínica Dental Sonrisa
--   Admin:          5551000001
--   Dra. María:     5551000002
--   Dr. Juan:       5551000003
--   Recepcionista:  5551000004
--   Paciente 1:     5551000005
--   Paciente 2:     5551000006
--
-- Nails Studio Express
--   Admin:          5552000001
--   Sandra:         5552000002
--   Cliente 1:      5552000003
--   Cliente 2:      5552000004
-- =============================================================
