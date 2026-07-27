import type { Request, Response } from 'express';
import * as dashboard from '../../services/dashboard.service';
import { sendSuccess } from '../../utils/ApiResponse';

/** Admin dashboard: KPIs, charts and recent activity. */

export async function getStats(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboard.getStats(), 'Dashboard statistics');
}

export async function getCharts(req: Request, res: Response): Promise<void> {
  const { granularity, days } = req.query as unknown as {
    granularity: 'daily' | 'weekly' | 'monthly';
    days: number;
  };

  sendSuccess(res, await dashboard.getCharts(granularity, days), 'Dashboard charts');
}

export async function getRecent(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboard.getRecent(), 'Recent activity');
}
