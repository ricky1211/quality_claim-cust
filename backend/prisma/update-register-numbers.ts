import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const complaints = await prisma.complaint.findMany({
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  });

  console.log(`Found ${complaints.length} complaints to update...`);

  // Group by year to have sequential counter per year
  const counterPerYear: Record<number, number> = {};

  for (const c of complaints) {
    const d = new Date(c.date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');

    counterPerYear[year] = (counterPerYear[year] || 0) + 1;
    const seq = String(counterPerYear[year]).padStart(2, '0');
    const newDocNo = `${seq}/QA/${month}/${year}`;

    await prisma.complaint.update({
      where: { id: c.id },
      data: { docNo: newDocNo },
    });

    console.log(`Updated ID ${c.id}: ${c.docNo} -> ${newDocNo}`);
  }

  console.log('All complaint register numbers updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
