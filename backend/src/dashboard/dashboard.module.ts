import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary(year: number) {
    const where = { date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } };

    const trendRaw = await this.prisma.$queryRaw<{ month: number; cases: number; reject: number }[]>`
      SELECT EXTRACT(MONTH FROM "date")::int AS month,
             COUNT(*)::int AS cases,
             COALESCE(SUM("rejectQty"), 0)::int AS reject
      FROM "Complaint"
      WHERE EXTRACT(YEAR FROM "date") = ${year}
      GROUP BY 1 ORDER BY 1`;
    const trend = Array.from({ length: 12 }, (_, i) => {
      const r = trendRaw.find((t) => t.month === i + 1);
      return { month: i + 1, cases: r?.cases ?? 0, reject: r?.reject ?? 0 };
    });

    // Pareto berdasarkan jenis cacat (urut qty reject terbesar + kumulatif %)
    const byDefect = await this.prisma.complaint.groupBy({
      by: ['defectType'], where, _sum: { rejectQty: true }, _count: { _all: true },
    });
    const sorted = byDefect
      .map((d) => ({ defectType: d.defectType, rejectQty: d._sum.rejectQty ?? 0, cases: d._count._all }))
      .sort((a, b) => b.rejectQty - a.rejectQty);
    const total = sorted.reduce((s, d) => s + d.rejectQty, 0) || 1;
    let run = 0;
    const pareto = sorted.map((d) => ({ ...d, cumPct: Math.round(((run += d.rejectQty) / total) * 1000) / 10 }));

    const status = await this.prisma.complaint.groupBy({ by: ['caseStatus'], where, _count: { _all: true } });
    const count = (s: string) => status.find((x) => x.caseStatus === s)?._count._all ?? 0;

    const byProduct = await this.prisma.complaint.groupBy({
      by: ['productId'], where, _sum: { rejectQty: true }, orderBy: { _sum: { rejectQty: 'desc' } }, take: 5,
    });
    const products = await this.prisma.product.findMany({ where: { id: { in: byProduct.map((p) => p.productId) } } });
    const topProducts = byProduct.map((p) => ({
      product: products.find((x) => x.id === p.productId)?.name ?? '-',
      rejectQty: p._sum.rejectQty ?? 0,
    }));

    const claimAgg = await this.prisma.claim.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { amount: true } });

    return {
      year,
      kpi: { open: count('OPEN'), closed: count('CLOSED'), totalReject: total === 1 && !sorted.length ? 0 : total },
      trend, pareto, topProducts,
      claims: claimAgg.map((c) => ({ status: c.status, count: c._count._all, amount: Number(c._sum.amount ?? 0) })),
    };
  }
}

@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}
  @Get()
  summary(@Query('year') year?: string) {
    return this.svc.summary(+(year ?? new Date().getFullYear()));
  }
}

@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
