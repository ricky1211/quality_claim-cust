import { PrismaClient, Role, ApprovalStatus, CaseStatus, ClaimCategory, ClaimStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const defaultHash = await bcrypt.hash('password123', 10);

  const users: [string, string, Role, string, string][] = [
    ['Administrator', 'admin@perusahaan.co.id', 'ADMIN', 'IT / Quality Control', adminHash],
    ['Admin', 'admin', 'ADMIN', 'IT / Quality Control', adminHash],
    ['Rina (QC Staff)', 'qc.staff@perusahaan.co.id', 'QC_STAFF', 'Quality Control', defaultHash],
    ['Budi (QC Supervisor)', 'qc.spv@perusahaan.co.id', 'QC_SUPERVISOR', 'Quality Control', defaultHash],
    ['Hendra (Manager)', 'manager@perusahaan.co.id', 'MANAGER', 'Management', defaultHash],
    ['Agus (Produksi)', 'produksi@perusahaan.co.id', 'PRODUKSI', 'Produksi', defaultHash],
    ['Sari (Marketing)', 'marketing@perusahaan.co.id', 'MARKETING', 'Marketing', defaultHash],
  ];

  for (const [name, email, role, department, passwordHash] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name, role, department },
      create: { name, email, role, department, passwordHash },
    });
  }

  const officialCustomers = [
    'PT Astra Honda Motor (AHM)',
    'PT Astra Daihatsu Motor (ADM)',
    'PT Toyota Motor Manufacturing Indonesia (TMMIN)',
    'PT Honda Prospect Motor (HPM)',
    'PT Suzuki Indomobil Motor (SIM)',
    'PT Isuzu Astra Motor Indonesia (IAMI)',
    'PT Hino Motors Manufacturing Indonesia (HMMI)',
    'PT Inti Ganda Perdana (IGP)',
    'PT Aichi Forging Indonesia (AFI)',
    'PT Toyota Auto Body-Tokai (TACI)',
    'PT Aisin Indonesia',
    'PT Denso Indonesia',
    'PT AT Indonesia (ATI)',
    'PT Otics Indonesia',
    'PT Yasunaga Indonesia',
    'PT Koyama Casting Indonesia',
    'PT Mitsubishi Motors Krama Yudha Indonesia (MMKI)',
    'PT Velasto Indonesia',
    'PT Menara Terus Makmur (M&T)',
    'PT FIM Piston Indonesia',
    'PT Kayaba Indonesia (KYB)',
    'PT Pamapersada Nusantara (PAMA)',
    'PT Contoh Otomotif',
    'PT Maju Mesin',
    'PT Sinar Gear',
  ];

  for (const name of officialCustomers) {
    await prisma.customer.upsert({ where: { name }, update: {}, create: { name } });
  }

  const parts: [string, string][] = [
    ['FG-1001', 'Crankshaft A'],
    ['FG-1002', 'Connecting Rod B'],
    ['FG-1003', 'Gear Blank C'],
    ['FG-1004', 'Camshaft D'],
  ];

  for (const [partNo, name] of parts) {
    await prisma.product.upsert({ where: { partNo }, update: {}, create: { partNo, name } });
  }

  // Seed 1 sample complaint in process (matches screenshot)
  const customer = await prisma.customer.findFirst();
  const product = await prisma.product.findFirst();
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin' } });

  if (customer && product && adminUser) {
    const existingComp = await prisma.complaint.findFirst({ where: { docNo: '01/QA/01/2026' } });
    if (!existingComp) {
      await prisma.complaint.create({
        data: {
          docNo: '01/QA/01/2026',
          date: new Date(),
          customerId: customer.id,
          productId: product.id,
          defectType: 'Dent / Scratch Surface',
          rejectQty: 25,
          picId: adminUser.id,
          description: 'Ditemukan goresan pada permukaan bearing saat proses incoming.',
          approvalStatus: ApprovalStatus.PREPARED,
          caseStatus: CaseStatus.OPEN,
        },
      });
    }
  }

  console.log('Seed selesai.');
  console.log('Akun Admin -> ID: admin | Password: admin123');
}

main().finally(() => prisma.$disconnect());
