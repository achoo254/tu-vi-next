import { type BirthInput, BirthInputSchema } from '@tuvi/chart/schema';
import * as z from 'zod/mini';
import { apiFetch } from './api-client';

const SavedChartSchema = z.object({ id: z.string(), createdAt: z.string(), input: BirthInputSchema });
export type SavedChart = z.infer<typeof SavedChartSchema>;

export async function listCharts(): Promise<SavedChart[]> {
  const body = z.object({ charts: z.array(SavedChartSchema) }).parse(await (await apiFetch('/api/charts')).json());
  return body.charts;
}

export async function saveChart(input: BirthInput): Promise<SavedChart> {
  const res = await apiFetch('/api/charts', { method: 'POST', body: JSON.stringify(input) });
  return z.object({ chart: SavedChartSchema }).parse(await res.json()).chart;
}

export async function deleteChart(id: string): Promise<void> {
  await apiFetch(`/api/charts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
