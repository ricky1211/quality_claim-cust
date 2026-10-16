import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const users: [string, string, Role, string][] = [
    ['Admin Sistem', 'admin@perusahaan.co.id', 'ADMIN', 'IT'],
    ['Rina (QC Staff)', 'qc.staff@perusahaan.co.id', 'QC_STAFF', 'Quality Control'],
    ['Budi (QC Supervisor)', 'qc.spv@perusahaan.co.id', 'QC_SUPERVISOR', 'Quality Control'],
    ['Hendra (Manager)', 'manager@perusahaan.co.id', 'MANAGER', 'Management'],
    ['Agus (Produksi)', 'produksi@perusahaan.co.id', 'PRODUKSI', 'Produksi'],
    ['Sari (Marketing)', 'marketing@perusahaan.co.id', 'MARKETING', 'Marketing'],
  ];
  for (const [name, email, role, department] of users) {
    await prisma.user.upsert({ where: { email }, update: {}, create: { name, email, role, department, passwordHash } });
  }
  for (const name of ['PT Contoh Otomotif', 'PT Maju Mesin', 'PT Sinar Gear']) {
    await prisma.customer.upsert({ where: { name }, update: {}, create: { name } });
  }
  const parts: [string, string][] = [['FG-1001', 'Crankshaft A'], ['FG-1002', 'Connecting Rod B'], ['FG-1003', 'Gear Blank C']];
  for (const [partNo, name] of parts) {
    await prisma.product.upsert({ where: { partNo }, update: {}, create: { partNo, name } });
  }
  console.log('Seed selesai. Kata sandi semua akun: password123');
}

main().finally(() => prisma.$disconnect());
