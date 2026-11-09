import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/db";
import { Tenant } from "@/entities/Tenant";

export async function GET() {
  try {
    const ds = await getDataSource();
    const tenantCount = await ds.getRepository<Tenant>("Tenant").count();
    const [{ current_database, current_schema }] = await ds.query(
      "SELECT current_database(), current_schema()"
    );

    return NextResponse.json({
      status: "ok",
      database: current_database,
      schema: current_schema,
      orm: "TypeORM",
      tenantsRegistered: tenantCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DB error";
    return NextResponse.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}

