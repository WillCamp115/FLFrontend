import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  computeFinalCategoryData,
  FinalCategoryData,
} from "./dataTransform";

export interface BudgetDonutChartProps {
  budgetData: any;
  transactionData: any[];
  categoryOverrides?: Record<string, any>;
  onCategoryClick?: (displayName: string, mappedCategory: string) => void;
  timePeriod?: string;
  width?: number;
  height?: number;
}

const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({
  budgetData,
  transactionData,
  categoryOverrides = {},
  onCategoryClick,
  timePeriod = 'current_month',
  width = 420,
  height = 420,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  const data: FinalCategoryData[] = useMemo(
    () => computeFinalCategoryData(budgetData, transactionData, categoryOverrides, timePeriod),
    [budgetData, transactionData, categoryOverrides, timePeriod]
  );

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const margin = 20;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.62;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Color palette using design tokens
    const palette = [
      "hsl(var(--primary))",
      "hsl(var(--accent))",
      "hsl(var(--secondary-foreground))",
      "hsl(var(--sidebar-primary))",
      "hsl(var(--muted-foreground))",
      "hsl(var(--ring))",
      "hsl(var(--card-foreground))",
      "hsl(var(--foreground))",
    ];

    // Special color for "Other" category
    const getColorForCategory = (categoryName: string): string => {
      if (categoryName === "Other") {
        return "#9333ea"; // Purple color for "Other" category
      }
      const index = data.findIndex(d => d.name === categoryName);
      return palette[index % palette.length];
    };

    const color = d3
      .scaleOrdinal<string>()
      .domain(data.map((d) => d.name))
      .range(data.map(d => getColorForCategory(d.name)));

    const pie = d3
      .pie<FinalCategoryData>()
      .value((d) => d.limit)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<FinalCategoryData>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(6)
      .padAngle(0.008);

    const arcs = pie(data);

    // Background arcs (budget limit)
    g.selectAll(".limit-arc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", "limit-arc")
      .attr("d", arc as any)
      .attr("fill", (d) => color(d.data.name) as string)
      .attr("opacity", 0.25)
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 2);

    // Spent foreground arcs (thickness = progress)
    g.selectAll(".spent-arc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", "spent-arc")
      .attr("fill", (d) => {
        const ratio = Math.min(d.data.spent / d.data.limit, 1);
        // Use red color for progress
        return ratio > 1
          ? "#dc2626"
          : "#ef4444";
      })
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 1)
      .attr("d", (d) => {
        const ratio = Math.min(d.data.spent / d.data.limit, 1);
        if (ratio <= 0) return null as any;
        const spentArc = d3
          .arc<d3.PieArcDatum<FinalCategoryData>>()
          .innerRadius(innerRadius)
          .outerRadius(innerRadius + (radius - innerRadius) * ratio)
          .cornerRadius(6)
          .startAngle(d.startAngle)
          .endAngle(d.endAngle);
        return spentArc(d as any) as any;
      })
      .append("title")
      .text(
        (d) =>
          `${d.data.name}\nSpent $${d.data.spent.toFixed(0)} of $${d.data.limit.toFixed(
            0
          )} (${Math.round(d.data.percentage)}%)`
      );

    // Interaction overlay
    g.selectAll(".hit-arc")
      .data(arcs)
      .enter()
      .append("path")
      .attr("class", "hit-arc")
      .attr("d", arc as any)
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mousemove", function (event, d) {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip({
          x,
          y,
          content: `${d.data.name}: $${d.data.spent.toFixed(0)} of $${d.data.limit.toFixed(
            0
          )} (${Math.round(d.data.percentage)}%)`,
        });
      })
      .on("mouseleave", () => setTooltip(null))
      .on("click", (_, d) => onCategoryClick?.(d.data.name, d.data.mappedCategory));

    // Center total
    const totalBudget = data.reduce((s, d) => s + d.limit, 0);
    const totalSpent = data.reduce((s, d) => s + d.spent, 0);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -6)
      .attr("font-weight", 700)
      .attr("fill", "hsl(var(--foreground))")
      .text(`$${totalSpent.toFixed(0)}`);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 12)
      .attr("font-size", 12)
      .attr("fill", "hsl(var(--muted-foreground))")
      .text(`of $${totalBudget.toFixed(0)}`);
  }, [data, height, width, onCategoryClick]);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center"
      aria-label="Budget donut chart"
    >
      <svg ref={svgRef} role="img" />
      {tooltip && (
        <div
          className="pointer-events-none absolute rounded-md bg-card px-2 py-1 text-xs shadow-md ring-1 ring-border"
          style={{ left: tooltip.x + 8, top: tooltip.y + 8 }}
        >
          <span className="text-foreground">{tooltip.content}</span>
        </div>
      )}
    </div>
  );
};

export default BudgetDonutChart;