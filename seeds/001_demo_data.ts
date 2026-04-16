import type { Knex } from 'knex';
import * as bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Clean existing data in order (respect FK constraints)
  await knex('appointment_products').del();
  await knex('appointments').del();
  await knex('service_products').del();
  await knex('services').del();
  await knex('products').del();
  await knex('business_schedules').del();
  await knex('portfolio').del();
  await knex('users').del();
  await knex('businesses').del();

  const passwordHash = await bcrypt.hash('123456', 10);

  // --------------- BUSINESS 1: Odontología ---------------
  const [dental] = await knex('businesses')
    .insert({
      name: 'Clínica Dental Sonrisa',
      type: 'ODONTOLOGIA',
      slug: 'clinica-dental-sonrisa',
      phone: '5551234567',
      address: 'Av. Principal 123, Ciudad',
    })
    .returning('*');

  // Users for dental clinic
  const [dentalAdmin] = await knex('users')
    .insert({
      business_id: dental.id,
      name: 'Admin Dental',
      phone: '5551000001',
      password: passwordHash,
      role: 'ADMIN',
      is_verified: true,
    })
    .returning('*');

  const [dentist1] = await knex('users')
    .insert({
      business_id: dental.id,
      name: 'Dra. María López',
      phone: '5551000002',
      password: passwordHash,
      role: 'PROFESIONAL',
      is_verified: true,
    })
    .returning('*');

  const [dentist2] = await knex('users')
    .insert({
      business_id: dental.id,
      name: 'Dr. Juan Pérez',
      phone: '5551000003',
      password: passwordHash,
      role: 'PROFESIONAL',
      is_verified: true,
    })
    .returning('*');

  const [receptionist1] = await knex('users')
    .insert({
      business_id: dental.id,
      name: 'Ana Recepción',
      phone: '5551000004',
      password: passwordHash,
      role: 'RECEPCIONISTA',
      is_verified: true,
    })
    .returning('*');

  const [patient1] = await knex('users')
    .insert({
      business_id: dental.id,
      name: 'Carlos Paciente',
      phone: '5551000005',
      password: passwordHash,
      role: 'PACIENTE',
      is_verified: true,
    })
    .returning('*');

  const [patient2] = await knex('users')
    .insert({
      business_id: dental.id,
      name: 'Laura Paciente',
      phone: '5551000006',
      password: passwordHash,
      role: 'PACIENTE',
      is_verified: true,
    })
    .returning('*');

  // Products for dental clinic
  const [resina] = await knex('products')
    .insert({ business_id: dental.id, name: 'Resina compuesta A2', description: 'Resina compuesta shade A2 jeringa 4g', price: 45.00, stock: 50, min_stock: 10, unit: 'jeringa' })
    .returning('*');

  const [anestesia] = await knex('products')
    .insert({ business_id: dental.id, name: 'Anestesia Lidocaína', description: 'Carpule de anestesia lidocaína 2%', price: 12.00, stock: 100, min_stock: 20, unit: 'carpule' })
    .returning('*');

  const [guantesD] = await knex('products')
    .insert({ business_id: dental.id, name: 'Guantes látex', description: 'Guantes desechables talla M', price: 0.50, stock: 500, min_stock: 100, unit: 'par' })
    .returning('*');

  const [fluoruro] = await knex('products')
    .insert({ business_id: dental.id, name: 'Flúor en gel', description: 'Gel de fluoruro de sodio 1.23%', price: 25.00, stock: 15, min_stock: 5, unit: 'frasco' })
    .returning('*');

  const [pastaPulir] = await knex('products')
    .insert({ business_id: dental.id, name: 'Pasta profiláctica', description: 'Pasta para pulido dental sabor menta', price: 18.00, stock: 8, min_stock: 5, unit: 'frasco' })
    .returning('*');

  // Services for dental clinic
  const [limpieza] = await knex('services')
    .insert({ business_id: dental.id, name: 'Limpieza dental', description: 'Limpieza profunda con ultrasonido y pulido', price: 80.00, duration: 45 })
    .returning('*');

  const [obturacion] = await knex('services')
    .insert({ business_id: dental.id, name: 'Obturación (relleno)', description: 'Restauración con resina compuesta', price: 120.00, duration: 60 })
    .returning('*');

  const [extraccion] = await knex('services')
    .insert({ business_id: dental.id, name: 'Extracción simple', description: 'Extracción de pieza dental sin complicaciones', price: 90.00, duration: 30 })
    .returning('*');

  const [blanqueamiento] = await knex('services')
    .insert({ business_id: dental.id, name: 'Blanqueamiento', description: 'Blanqueamiento dental con gel peróxido', price: 250.00, duration: 90 })
    .returning('*');

  // Service products (materials per service)
  await knex('service_products').insert([
    { service_id: limpieza.id, product_id: pastaPulir.id, quantity_used: 1 },
    { service_id: limpieza.id, product_id: guantesD.id, quantity_used: 1 },
    { service_id: limpieza.id, product_id: fluoruro.id, quantity_used: 1 },
    { service_id: obturacion.id, product_id: resina.id, quantity_used: 1 },
    { service_id: obturacion.id, product_id: anestesia.id, quantity_used: 2 },
    { service_id: obturacion.id, product_id: guantesD.id, quantity_used: 2 },
    { service_id: extraccion.id, product_id: anestesia.id, quantity_used: 3 },
    { service_id: extraccion.id, product_id: guantesD.id, quantity_used: 2 },
  ]);

  // Appointments for dental clinic
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  await knex('appointments').insert([
    {
      business_id: dental.id,
      patient_id: patient1.id,
      professional_id: dentist1.id,
      service_id: limpieza.id,
      date_time: `${todayStr}T09:00:00`,
      status: 'CONFIRMADA',
      total_price: 80.00,
      notes: 'Paciente regular, control semestral',
    },
    {
      business_id: dental.id,
      patient_id: patient2.id,
      professional_id: dentist1.id,
      service_id: obturacion.id,
      date_time: `${todayStr}T10:30:00`,
      status: 'PENDIENTE',
      total_price: 120.00,
    },
    {
      business_id: dental.id,
      patient_id: patient1.id,
      professional_id: dentist2.id,
      service_id: extraccion.id,
      date_time: `${todayStr}T11:00:00`,
      status: 'PENDIENTE',
      total_price: 90.00,
      notes: 'Molar superior derecho',
    },
    {
      business_id: dental.id,
      patient_id: patient2.id,
      professional_id: dentist2.id,
      service_id: blanqueamiento.id,
      date_time: `${todayStr}T14:00:00`,
      status: 'PENDIENTE',
      total_price: 250.00,
    },
  ]);

  // --------------- BUSINESS 2: Manicurista ---------------
  const [nails] = await knex('businesses')
    .insert({
      name: 'Nails Studio Express',
      type: 'MANICURISTA',
      slug: 'nails-studio-express',
      phone: '5552234567',
      address: 'Centro Comercial Plaza, Local 45',
    })
    .returning('*');

  // Users for nail studio
  const [nailAdmin] = await knex('users')
    .insert({
      business_id: nails.id,
      name: 'Admin Nails',
      phone: '5552000001',
      password: passwordHash,
      role: 'ADMIN',
      is_verified: true,
    })
    .returning('*');

  const [manicurista1] = await knex('users')
    .insert({
      business_id: nails.id,
      name: 'Sandra Estilista',
      phone: '5552000002',
      password: passwordHash,
      role: 'PROFESIONAL',
      is_verified: true,
    })
    .returning('*');

  const [nailPatient1] = await knex('users')
    .insert({
      business_id: nails.id,
      name: 'Fernanda Cliente',
      phone: '5552000003',
      password: passwordHash,
      role: 'PACIENTE',
      is_verified: true,
    })
    .returning('*');

  const [nailPatient2] = await knex('users')
    .insert({
      business_id: nails.id,
      name: 'Gabriela Cliente',
      phone: '5552000004',
      password: passwordHash,
      role: 'PACIENTE',
      is_verified: true,
    })
    .returning('*');

  // Products for nail studio
  const [esmalte] = await knex('products')
    .insert({ business_id: nails.id, name: 'Esmalte gel rojo', description: 'Esmalte gel semi permanente rojo', price: 15.00, stock: 30, min_stock: 5, unit: 'frasco' })
    .returning('*');

  const [acrilico] = await knex('products')
    .insert({ business_id: nails.id, name: 'Polvo acrílico rosa', description: 'Polvo acrílico para esculpido', price: 35.00, stock: 20, min_stock: 5, unit: 'frasco' })
    .returning('*');

  const [acetona] = await knex('products')
    .insert({ business_id: nails.id, name: 'Acetona pura', description: 'Acetona para remoción de esmalte', price: 8.00, stock: 3, min_stock: 5, unit: 'litro' })
    .returning('*');

  const [limas] = await knex('products')
    .insert({ business_id: nails.id, name: 'Lima 180/240', description: 'Lima media/fina para uñas', price: 2.00, stock: 100, min_stock: 20, unit: 'pieza' })
    .returning('*');

  // Services for nail studio
  const [manicure] = await knex('services')
    .insert({ business_id: nails.id, name: 'Manicure gel', description: 'Aplicación de esmalte semi permanente', price: 45.00, duration: 45 })
    .returning('*');

  const [esculpidas] = await knex('services')
    .insert({ business_id: nails.id, name: 'Uñas esculpidas', description: 'Esculpido acrílico con diseño', price: 80.00, duration: 90 })
    .returning('*');

  const [remocion] = await knex('services')
    .insert({ business_id: nails.id, name: 'Remoción', description: 'Remoción de esmalte gel o acrílico', price: 20.00, duration: 20 })
    .returning('*');

  // Service products for nail studio
  await knex('service_products').insert([
    { service_id: manicure.id, product_id: esmalte.id, quantity_used: 1 },
    { service_id: manicure.id, product_id: limas.id, quantity_used: 1 },
    { service_id: esculpidas.id, product_id: acrilico.id, quantity_used: 1 },
    { service_id: esculpidas.id, product_id: limas.id, quantity_used: 2 },
    { service_id: remocion.id, product_id: acetona.id, quantity_used: 1 },
    { service_id: remocion.id, product_id: limas.id, quantity_used: 1 },
  ]);

  // Appointments for nail studio
  await knex('appointments').insert([
    {
      business_id: nails.id,
      patient_id: nailPatient1.id,
      professional_id: manicurista1.id,
      service_id: manicure.id,
      date_time: `${todayStr}T10:00:00`,
      status: 'CONFIRMADA',
      total_price: 45.00,
    },
    {
      business_id: nails.id,
      patient_id: nailPatient2.id,
      professional_id: manicurista1.id,
      service_id: esculpidas.id,
      date_time: `${todayStr}T11:00:00`,
      status: 'PENDIENTE',
      total_price: 80.00,
      notes: 'Diseño francés con glitter',
    },
  ]);

  // --------------- PORTFOLIO ENTRIES ---------------
  await knex('portfolio').insert([
    {
      business_id: dental.id,
      user_id: dentist1.id,
      title: 'Blanqueamiento láser',
      description: 'Resultado de blanqueamiento con láser en una sesión',
      image_url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600',
      is_active: true,
    },
    {
      business_id: dental.id,
      user_id: dentist2.id,
      title: 'Carillas de porcelana',
      description: 'Colocación de carillas en sector anterior',
      image_url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600',
      is_active: true,
    },
    {
      business_id: dental.id,
      user_id: dentist1.id,
      title: 'Ortodoncia invisible',
      description: 'Caso completado con alineadores transparentes',
      image_url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600',
      is_active: true,
    },
    {
      business_id: nails.id,
      user_id: manicurista1.id,
      title: 'Diseño francés elegante',
      description: 'Uñas esculpidas con diseño francés y glitter',
      image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600',
      is_active: true,
    },
    {
      business_id: nails.id,
      user_id: manicurista1.id,
      title: 'Nail art tropical',
      description: 'Diseño personalizado con motivos tropicales',
      image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600',
      is_active: true,
    },
    {
      business_id: nails.id,
      user_id: manicurista1.id,
      title: 'Acrílico efecto mármol',
      description: 'Uñas esculpidas con técnica de mármol',
      image_url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=600',
      is_active: true,
    },
  ]);

  // --------------- BUSINESS SCHEDULES ---------------
  // Dental: Mon-Fri 08:00-17:00
  for (let day = 1; day <= 5; day++) {
    await knex('business_schedules').insert({
      business_id: dental.id,
      day_of_week: day,
      open_time: '08:00',
      close_time: '17:00',
      is_active: true,
    });
  }

  // Nails: Mon-Sat 09:00-19:00
  for (let day = 1; day <= 6; day++) {
    await knex('business_schedules').insert({
      business_id: nails.id,
      day_of_week: day,
      open_time: '09:00',
      close_time: '19:00',
      is_active: true,
    });
  }

  console.log('✅ Seed completed successfully');
  console.log('');
  console.log('=== Credenciales de prueba (password: 123456) ===');
  console.log('');
  console.log('--- Clínica Dental Sonrisa ---');
  console.log('  Admin:        5551000001');
  console.log('  Dra. María:   5551000002');
  console.log('  Dr. Juan:     5551000003');
  console.log('  Recepción:    5551000004');
  console.log('  Paciente 1:   5551000005');
  console.log('  Paciente 2:   5551000006');
  console.log('');
  console.log('--- Nails Studio Express ---');
  console.log('  Admin:        5552000001');
  console.log('  Sandra:       5552000002');
  console.log('  Cliente 1:    5552000003');
  console.log('  Cliente 2:    5552000004');
}
