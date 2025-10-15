import React, { useMemo, useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { computeFinalCategoryData, FinalCategoryData } from "./dataTransform";

export interface BudgetDumbbellChartProps {
  budgetData: any;
  transactionData: any[];
  categoryOverrides?: Record<string, any>;
  timePeriod?: string;
  onCategoryClick?: (displayName: string, mappedCategory: string) => void;
  width?: number;
}

const rowHeight = 44;
const margins = { top: 24, right: 24, bottom: 40, left: 140 };

const BudgetDumbbellChart: React.FC<BudgetDumbbellChartProps> = ({
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

  const height = useMemo(() => margins.top + margins.bottom + rowHeight * data.length, [data.length]);

  useEffect(() => {
    if (!containerRef.current) return;
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
      .padding(0.5);

    // Axes
    g.append("g")
      .attr("transform", `translate(0, ${height - margins.top - margins.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((v) => `$${Number(v).toFixed(0)}` as any))
      .selectAll("text")
      .attr("fill", "hsl(var(--muted-foreground))");

    g.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll("text")
      .attr("fill", "hsl(var(--foreground))")
      .style("cursor", "pointer")
      .on("click", (_, name) => {
        const d = data.find((x) => x.name === name);
        if (d) onCategoryClick?.(d.name, d.mappedCategory);
      });

    // Groups per row
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

    // Connecting lines (progress)
    row
      .append("line")
      .attr("x1", (d) => x(Math.min(d.limit, d.spent)))
      .attr("x2", (d) => x(Math.max(d.limit, d.spent)))
      .attr("y1", y.bandwidth() / 2)
      .attr("y2", y.bandwidth() / 2)
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 6)
      .attr("stroke-linecap", "round")
      .attr("opacity", 0.85);

    // Budget (target) circle
    row
      .append("circle")
      .attr("cx", (d) => x(d.limit))
      .attr("cy", y.bandwidth() / 2)
      .attr("r", 7)
      .attr("fill", "hsl(var(--primary))")
      .append("title")
      .text((d) => `${d.name} budget: $${d.limit.toFixed(0)}`);

    // Spent circle
    row
      .append("circle")
      .attr("cx", (d) => x(d.spent))
      .attr("cy", y.bandwidth() / 2)
      .attr("r", 7)
      .attr("fill", "#ef4444")
      .append("title")
      .text((d) => `${d.name} spent: $${d.spent.toFixed(0)}`);
  }, [data, height, width, onCategoryClick]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg role="img" aria-label="Budget dumbbell chart" />
      {tooltip && (
        <div
          className="pointer-events-none absolute rounded-md bg-card px-2 py-1 text-xs shadow-md ring-1 ring-border"
          style={{ left: tooltip.x + 8, top: tooltip.y + 8 }}
        >
          <span className="text-foreground">{tooltip.content}</span>
        </div>
      )}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-primary" /> Budget</div>
        <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-destructive" /> Spent</div>
      </div>
    </div>
  );
};

export default BudgetDumbbellChart;
