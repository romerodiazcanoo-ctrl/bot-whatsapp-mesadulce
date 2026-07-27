"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SerieSemanal } from "@/lib/analytics";

export default function HistorialCharts({ semanas }: { semanas: SerieSemanal[] }) {
  const data = semanas.map((s) => ({ semana: s.semana, unidades: Math.round(s.total * 10) / 10 }));

  return (
    <div className="h-72 w-full rounded-xl border border-stone-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#78716c" }} />
          <YAxis tick={{ fontSize: 12, fill: "#78716c" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e7e5e4" }}
            formatter={(value) => [`${value} unidades`, "Producción"]}
          />
          <Bar dataKey="unidades" fill="#d97706" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
