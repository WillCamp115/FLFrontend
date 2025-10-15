import React, { useMemo, useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { computeFinalCategoryData, FinalCategoryData } from "./dataTransform";

export interface BudgetBulletChartProps {
  budgetData: any;
  transactionData: any[];
  categoryOverrides?: Record<string, any>;
  timePeriod?: string;
  onCategoryClick?: (displayName: string, mappedCategory: string) => void;
  width?: number;
}

const margins = { top: 16, right: 24, bottom: 24, left: 140 };
const rowHeight = 34;

const BudgetBulletChart: React.FC<BudgetBulletChartProps> = ({
  budgetData,
  transactionData,
  categoryOverrides = {},
  timePeriod = 'current_month',
  onCategoryClick,
  width = 780,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(
    null
  );

  const data: FinalCategoryData[] = useMemo(
    () => computeFinalCategoryData(budgetData, transactionData, categoryOverrides, timePeriod),
    [budgetData, transactionData, categoryOverrides, timePeriod]
  );

  const height = useMemo(
    () => margins.top + margins.bottom + rowHeight * data.length,
    [data.length]
  );

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;
    const svg = d3
      .select(containerRef.current)
      .select("svg")
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();
    const g = svg
      .append("g")
      .attr("transform", `translate(${margins.left},${margins.top})`);

    const maxX = Math.max(10, d3.max(data, (d) => Math.max(d.limit, d.spent)) || 0) * 1.15;
    const x = d3.scaleLinear().domain([0, maxX]).range([0, width - margins.left - margins.right]);
    const y = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.name))
      .range([0, height - margins.top - margins.bottom])
      .padding(0.4);

    // Axis
    g.append("g")
      .call(d3.axisLeft(y).tickSize(0).tickPadding(10)) // CHANGED: Added padding
      .selectAll("text")
      .attr("fill", "gray"); // CHANGED: Set a visible color

    g.append("g")
      .attr("transform", `translate(0, ${height - margins.top - margins.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((v) => `$${Number(v).toFixed(0)}` as any))
      .selectAll("text")
      .attr("fill", "#9ca3af"); // CHANGED: Set a visible muted color

    const row = g
      .selectAll(".row")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "row")
      .attr("transform", (d) => `translate(0, ${y(d.name) || 0})`)
      .style("cursor", "pointer")
      .on("mousemove", function (event, d) {
        const [xPos, yPos] = d3.pointer(event, containerRef.current);
        setTooltip({
          x: xPos,
          y: yPos,
          content: `${d.name}: Spent $${d.spent.toFixed(0)} / $${d.limit.toFixed(0)} (${Math.round(
            d.percentage
          )}%)`,
        });
      })
      .on("mouseleave", () => setTooltip(null))
      .on("click", (_, d) => onCategoryClick?.(d.name, d.mappedCategory));

    // Track (limit)
    row
      .append("rect")
      .attr("x", 0)
      .attr("y", -y.bandwidth() / 4)
      .attr("height", y.bandwidth() / 2)
      .attr("width", (d) => x(d.limit))
      .attr("fill", "#e5e7eb"); // CHANGED: Set a light gray background

    // Spent bar
    row
      .append("rect")
      .attr("x", 0)
      .attr("y", -y.bandwidth() / 6)
      .attr("height", y.bandwidth() / 3)
      .attr("width", (d) => x(Math.min(d.spent, d.limit)))
      .attr("fill", "#ef4444");

    // Overshoot indicator if any
    row
      .filter((d) => d.spent > d.limit)
      .append("line")
      .attr("x1", (d) => x(d.limit))
      .attr("x2", (d) => x(Math.min(d.spent, maxX)))
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#dc2626")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 3");

    // Marker at limit
    row
      .append("line")
      .attr("x1", (d) => x(d.limit))
      .attr("x2", (d) => x(d.limit))
      .attr("y1", -y.bandwidth() / 2.2)
      .attr("y2", y.bandwidth() / 2.2)
      .attr("stroke", "black")
      .attr("stroke-width", 1.5);
  }, [data, height, width, onCategoryClick]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg role="img" aria-label="Budget bullet chart" />
      {tooltip && (
        <div
          className="pointer-events-none absolute rounded-md bg-white px-2 py-1 text-xs shadow-md ring-1 ring-gray-200" // CHANGED: Simplified tooltip style
          style={{ left: tooltip.x + 8, top: tooltip.y + 8 }}
        >
          <span className="text-black">{tooltip.content}</span>
        </div>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-[#e5e7eb] ring-1 ring-gray-400" /> Limit</div>
        <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 bg-[#ef4444]" /> Spent</div>
      </div>
    </div>
  );
};

export default BudgetBulletChart;
