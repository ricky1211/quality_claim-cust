import { PrismaClient, Role, ApprovalStatus, CaseStatus, ClaimCategory, ClaimStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich manufacturing data for Quality Claim & Complaint Customer...');

  // 1. Customers
  const customerNames = [
    'PT Astra Honda Motor (AHM)',
    'PT Astra Daihatsu Motor (ADM)',
    'PT Toyota Motor Manufacturing Indonesia',
    'PT Hino Motors Manufacturing Indonesia',
    'PT Maju Mesin',
    'PT Sinar Gear',
  ];

  const customers: Record<string, any> = {};
  for (const name of customerNames) {
    customers[name] = await prisma.customer.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 2. Products
  const productData = [
    { partNo: 'FG-1001', name: 'Crankshaft 150cc Forging' },
    { partNo: 'FG-1002', name: 'Connecting Rod Type-B' },
    { partNo: 'FG-1003', name: 'Camshaft High Performance' },
    { partNo: 'FG-1004', name: 'Gear Blank Primary 32T' },
    { partNo: 'FG-1005', name: 'Hub Wheel Front Machining' },
    { partNo: 'NF-2001', name: 'Flange Coupling Non-Forging' },
    { partNo: 'NF-2002', name: 'Bracket Support Bracket NF' },
  ];

  const products: Record<string, any> = {};
  for (const p of productData) {
    products[p.partNo] = await prisma.product.upsert({
      where: { partNo: p.partNo },
      update: { name: p.name },
      create: p,
    });
  }

  // 3. Users
  const users = await prisma.user.findMany();
  const qcStaff = users.find((u) => u.role === 'QC_STAFF') || users[0];
  const qcSpv = users.find((u) => u.role === 'QC_SUPERVISOR') || users[0];
  const manager = users.find((u) => u.role === 'MANAGER') || users[0];

  // 4. Sample Complaints across 2026
  const complaintsSeed = [
    // Jan 2026
    {
      docNo: '01/QA/01/2026',
      date: new Date('2026-01-12'),
      customer: 'PT Astra Honda Motor (AHM)',
      product: 'FG-1001',
      defectType: 'Run Out Over',
      rejectQty: 42,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-01-13'),
      checkedAt: new Date('2026-01-14'),
      approvedAt: new Date('2026-01-15'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Run out melebihi toleransi drawing 0.05mm saat machining shaft.',
    },
    {
      docNo: '02/QA/01/2026',
      date: new Date('2026-01-20'),
      customer: 'PT Astra Daihatsu Motor (ADM)',
      product: 'FG-1002',
      defectType: 'Dimension Out',
      rejectQty: 30,
      picId: qcSpv.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-01-21'),
      checkedAt: new Date('2026-01-22'),
      approvedAt: new Date('2026-01-23'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Diameter pin bore over tolerance 0.02mm.',
    },
    // Feb 2026
    {
      docNo: '03/QA/02/2026',
      date: new Date('2026-02-08'),
      customer: 'PT Toyota Motor Manufacturing Indonesia',
      product: 'FG-1003',
      defectType: 'Karat',
      rejectQty: 65,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-02-09'),
      checkedAt: new Date('2026-02-10'),
      approvedAt: new Date('2026-02-11'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Karat kemerahan pada permukaan part akibat anti-rust wash berkurang.',
    },
    {
      docNo: '04/QA/02/2026',
      date: new Date('2026-02-19'),
      customer: 'PT Astra Honda Motor (AHM)',
      product: 'FG-1004',
      defectType: 'Dent / Scratch Surface',
      rejectQty: 28,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-02-20'),
      checkedAt: new Date('2026-02-21'),
      approvedAt: new Date('2026-02-22'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Dent terbentur saat handling bin box di lini finishing.',
    },
    // Mar 2026
    {
      docNo: '05/QA/03/2026',
      date: new Date('2026-03-05'),
      customer: 'PT Hino Motors Manufacturing Indonesia',
      product: 'FG-1001',
      defectType: 'Crack Forging',
      rejectQty: 18,
      picId: qcSpv.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-03-06'),
      checkedAt: new Date('2026-03-07'),
      approvedAt: new Date('2026-03-08'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Retak mikro pada fillet radius terdeteksi uji MPI.',
    },
    {
      docNo: '06/QA/03/2026',
      date: new Date('2026-03-24'),
      customer: 'PT Astra Daihatsu Motor (ADM)',
      product: 'FG-1005',
      defectType: 'Run Out Over',
      rejectQty: 35,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-03-25'),
      checkedAt: new Date('2026-03-26'),
      approvedAt: new Date('2026-03-27'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Runout flange face over 0.04mm.',
    },
    // Apr 2026
    {
      docNo: '07/QA/04/2026',
      date: new Date('2026-04-11'),
      customer: 'PT Astra Honda Motor (AHM)',
      product: 'FG-1002',
      defectType: 'Karat',
      rejectQty: 55,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-04-12'),
      checkedAt: new Date('2026-04-13'),
      approvedAt: new Date('2026-04-14'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Titik oksidasi pada packaging plastic VCI.',
    },
    // Mei 2026
    {
      docNo: '08/QA/05/2026',
      date: new Date('2026-05-15'),
      customer: 'PT Toyota Motor Manufacturing Indonesia',
      product: 'FG-1003',
      defectType: 'Dimension Out',
      rejectQty: 22,
      picId: qcSpv.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-05-16'),
      checkedAt: new Date('2026-05-17'),
      approvedAt: new Date('2026-05-18'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Ketebalan flange tipis 0.15mm dari spesifikasi nominal.',
    },
    // Jun 2026
    {
      docNo: '09/QA/06/2026',
      date: new Date('2026-06-18'),
      customer: 'PT Astra Daihatsu Motor (ADM)',
      product: 'FG-1001',
      defectType: 'Pin Hole / Blow Hole',
      rejectQty: 15,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-06-19'),
      checkedAt: new Date('2026-06-20'),
      approvedAt: new Date('2026-06-21'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Pinhole gas pocket pada area sambungan counterweight.',
    },
    // Jul 2026
    {
      docNo: '10/QA/07/2026',
      date: new Date('2026-07-22'),
      customer: 'PT Hino Motors Manufacturing Indonesia',
      product: 'FG-1004',
      defectType: 'Run Out Over',
      rejectQty: 38,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-07-23'),
      checkedAt: new Date('2026-07-24'),
      approvedAt: new Date('2026-07-25'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Runout cam journal nomor 2 out standard.',
    },
    // Agu 2026
    {
      docNo: '11/QA/08/2026',
      date: new Date('2026-08-14'),
      customer: 'PT Astra Honda Motor (AHM)',
      product: 'FG-1005',
      defectType: 'Karat',
      rejectQty: 70,
      picId: qcStaff.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-08-15'),
      checkedAt: new Date('2026-08-16'),
      approvedAt: new Date('2026-08-17'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Karat bercak coklat pada alur spline.',
    },
    // Sep 2026
    {
      docNo: '12/QA/09/2026',
      date: new Date('2026-09-09'),
      customer: 'PT Maju Mesin',
      product: 'NF-2001',
      defectType: 'Dimension Out',
      rejectQty: 26,
      picId: qcSpv.id,
      caseStatus: CaseStatus.CLOSED,
      approvalStatus: ApprovalStatus.APPROVED,
      preparedAt: new Date('2026-09-10'),
      checkedAt: new Date('2026-09-11'),
      approvedAt: new Date('2026-09-12'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":true}] Pitch jarak baut flange melenceng 0.3mm.',
    },
    // Okt 2026 - Current Active / Open / Hold cases
    {
      docNo: '13/QA/10/2026',
      date: new Date('2026-10-02'),
      customer: 'PT Astra Honda Motor (AHM)',
      product: 'FG-1001',
      defectType: 'Karat',
      rejectQty: 48,
      picId: qcStaff.id,
      caseStatus: CaseStatus.OPEN,
      approvalStatus: ApprovalStatus.CHECKED,
      preparedAt: new Date('2026-10-03'),
      checkedAt: new Date('2026-10-04'),
      description: '[DOCS:{"fmea":true,"ecn":true,"controlPlan":true,"controlSheet":true,"mpsEos":false}] Karat basah terdeteksi pada 2 palet delivery lot A-44. Menunggu persetujuan Manager.',
    },
    {
      docNo: '14/QA/10/2026',
      date: new Date('2026-10-08'),
      customer: 'PT Astra Daihatsu Motor (ADM)',
      product: 'FG-1002',
      defectType: 'Run Out Over',
      rejectQty: 32,
      picId: qcSpv.id,
      caseStatus: CaseStatus.OPEN,
      approvalStatus: ApprovalStatus.PREPARED,
      preparedAt: new Date('2026-10-09'),
      description: '[DOCS:{"fmea":true,"ecn":false,"controlPlan":true,"controlSheet":false,"mpsEos":false}] Bending runout pada big end connecting rod saat assembly line customer.',
    },
    {
      docNo: '15/QA/10/2026',
      date: new Date('2026-10-12'),
      customer: 'PT Toyota Motor Manufacturing Indonesia',
      product: 'FG-1003',
      defectType: 'Dimension Out',
      rejectQty: 20,
      picId: qcStaff.id,
      caseStatus: CaseStatus.OPEN,
      approvalStatus: ApprovalStatus.DRAFT,
      description: '[DOCS:{"fmea":false,"ecn":false,"controlPlan":true,"controlSheet":false,"mpsEos":false}] Base circle camshaft undersize 0.03mm. Tim QC sedang investigasi tool wear.',
    },
    {
      docNo: '16/QA/10/2026',
      date: new Date('2026-10-15'),
      customer: 'PT Hino Motors Manufacturing Indonesia',
      product: 'FG-1004',
      defectType: 'Dent / Scratch Surface',
      rejectQty: 16,
      picId: qcSpv.id,
      caseStatus: CaseStatus.OPEN,
      approvalStatus: ApprovalStatus.PREPARED,
      preparedAt: new Date('2026-10-16'),
      description: '[DOCS:{"fmea":true,"ecn":false,"controlPlan":true,"controlSheet":true,"mpsEos":false}] Goresan melintang pada permukaan gigi gear primary.',
    },
    {
      docNo: '17/QA/10/2026',
      date: new Date('2026-10-17'),
      customer: 'PT Sinar Gear',
      product: 'NF-2002',
      defectType: 'Crack Forging',
      rejectQty: 12,
      picId: qcStaff.id,
      caseStatus: CaseStatus.OPEN,
      approvalStatus: ApprovalStatus.DRAFT,
      description: '[DOCS:{"fmea":false,"ecn":false,"controlPlan":false,"controlSheet":false,"mpsEos":false}] Retak rambut di pangkal bracket NF support.',
    },
  ];

  for (const comp of complaintsSeed) {
    const cust = customers[comp.customer];
    const prod = products[comp.product];
    if (!cust || !prod) continue;

    await prisma.complaint.upsert({
      where: { docNo: comp.docNo },
      update: {
        date: comp.date,
        customerId: cust.id,
        productId: prod.id,
        defectType: comp.defectType,
        rejectQty: comp.rejectQty,
        picId: comp.picId,
        caseStatus: comp.caseStatus,
        approvalStatus: comp.approvalStatus,
        preparedAt: comp.preparedAt ?? null,
        checkedAt: comp.checkedAt ?? null,
        approvedAt: comp.approvedAt ?? null,
        description: comp.description,
      },
      create: {
        docNo: comp.docNo,
        date: comp.date,
        customerId: cust.id,
        productId: prod.id,
        defectType: comp.defectType,
        rejectQty: comp.rejectQty,
        picId: comp.picId,
        caseStatus: comp.caseStatus,
        approvalStatus: comp.approvalStatus,
        preparedAt: comp.preparedAt ?? null,
        checkedAt: comp.checkedAt ?? null,
        approvedAt: comp.approvedAt ?? null,
        description: comp.description,
      },
    });
  }

  // 5. Financial Claims Seed
  const claimsSeed = [
    {
      claimNo: 'CLM-FG/2026/0001',
      date: new Date('2026-01-25'),
      category: ClaimCategory.FG,
      customer: 'PT Astra Honda Motor (AHM)',
      product: 'FG-1001',
      qty: 42,
      amount: 35500000,
      status: ClaimStatus.SELESAI,
      notes: 'Klaim biaya sortir dan machining ulang shaft 42 pcs.',
    },
    {
      claimNo: 'CLM-FG/2026/0002',
      date: new Date('2026-02-28'),
      category: ClaimCategory.FG,
      customer: 'PT Toyota Motor Manufacturing Indonesia',
      product: 'FG-1003',
      qty: 65,
      amount: 48200000,
      status: ClaimStatus.SELESAI,
      notes: 'Klaim pembersihan karat, pergantian packing, dan biaya line stop.',
    },
    {
      claimNo: 'CLM-NF/2026/0001',
      date: new Date('2026-03-18'),
      category: ClaimCategory.NON_FORGING,
      customer: 'PT Maju Mesin',
      product: 'NF-2001',
      qty: 25,
      amount: 14500000,
      status: ClaimStatus.SELESAI,
      notes: 'Klaim rework bracket coupling non-forging.',
    },
    {
      claimNo: 'CLM-FG/2026/0003',
      date: new Date('2026-04-20'),
      category: ClaimCategory.FG,
      customer: 'PT Astra Daihatsu Motor (ADM)',
      product: 'FG-1002',
      qty: 30,
      amount: 28000000,
      status: ClaimStatus.SELESAI,
      notes: 'Klaim reject conrod dimension out.',
    },
    {
      claimNo: 'CLM-FG/2026/0004',
      date: new Date('2026-06-25'),
      category: ClaimCategory.FG,
      customer: 'PT Hino Motors Manufacturing Indonesia',
      product: 'FG-1004',
      qty: 38,
      amount: 32000000,
      status: ClaimStatus.DISETUJUI,
      notes: 'Klaim scrap gear primary runout over.',
    },
    {
      claimNo: 'CLM-NF/2026/0002',
      date: new Date('2026-08-20'),
      category: ClaimCategory.NON_FORGING,
      customer: 'PT Sinar Gear',
      product: 'NF-2002',
      qty: 35,
      amount: 19800000,
      status: ClaimStatus.INVESTIGASI,
      notes: 'Klaim non-forging bracket retak dalam proses investigasi bersama.',
    },
    {
      claimNo: 'CLM-FG/2026/0005',
      date: new Date('2026-10-10'),
      category: ClaimCategory.FG,
      customer: 'PT Astra Honda Motor (AHM)',
      product: 'FG-1001',
      qty: 48,
      amount: 42500000,
      status: ClaimStatus.INVESTIGASI,
      notes: 'Potensi potongan tagihan untuk komplain karat 2 palet.',
    },
    {
      claimNo: 'CLM-FG/2026/0006',
      date: new Date('2026-10-16'),
      category: ClaimCategory.FG,
      customer: 'PT Astra Daihatsu Motor (ADM)',
      product: 'FG-1002',
      qty: 32,
      amount: 29500000,
      status: ClaimStatus.INVESTIGASI,
      notes: 'Klaim pending approval ADM terkait conrod bending.',
    },
  ];

  for (const cl of claimsSeed) {
    const cust = customers[cl.customer];
    const prod = products[cl.product];
    if (!cust || !prod) continue;

    await prisma.claim.upsert({
      where: { claimNo: cl.claimNo },
      update: {
        date: cl.date,
        category: cl.category,
        customerId: cust.id,
        productId: prod.id,
        qty: cl.qty,
        amount: cl.amount,
        status: cl.status,
        notes: cl.notes,
      },
      create: {
        claimNo: cl.claimNo,
        date: cl.date,
        category: cl.category,
        customerId: cust.id,
        productId: prod.id,
        qty: cl.qty,
        amount: cl.amount,
        status: cl.status,
        notes: cl.notes,
      },
    });
  }

  console.log('Seed enriched successfully! Realistic data populated.');
}

main().finally(() => prisma.$disconnect());
