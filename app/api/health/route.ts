export async function GET() {
  return Response.json({
    status: 'HEALTHY',
    service: 'GBA Corporation DC-BMS',
    backend: 'supabase',
    financialYear: '2025-26',
    timestamp: new Date().toISOString(),
  });
}
