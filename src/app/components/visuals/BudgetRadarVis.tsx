import React, { useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { computeFinalCategoryData, FinalCategoryData } from "./dataTransform";

type Props = {
  budgetData: any;
  transactionData: any[];
  categoryOverrides?: Record<string, any>;
  timePeriod?: string;
  onCategoryClick?: (displayName: string, mapped: string) => void;
};

const ClickableTick: React.FC<any> = ({ x, y, payload, onClick }) => {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="cursor-pointer select-none"
      fill="#374151"
      fontSize={12}
      onClick={() => onClick?.(payload.value)}
    >
      {payload.value}
    </text>
  );
};

const BudgetRadarChart: React.FC<Props> = ({ budgetData, transactionData, categoryOverrides = {}, timePeriod = 'current_month', onCategoryClick }) => {
  const data = useMemo<FinalCategoryData[]>(() => {
    const result = computeFinalCategoryData(budgetData, transactionData, categoryOverrides, timePeriod);
    console.log('=== BudgetRadarChart Debug ===');
    console.log('budgetData:', budgetData);
    console.log('transactionData length:', transactionData?.length || 0);
    console.log('computed data:', result);
    return result;
  }, [budgetData, transactionData, categoryOverrides, timePeriod]);

  const nameToMapped = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    data.forEach((d) => (map[d.name] = d.mappedCategory));
    return map;
  }, [data]);

  const handleTickClick = useCallback(
    (label: string) => {
      const mapped = nameToMapped[label];
      if (mapped && onCategoryClick) onCategoryClick(label, mapped);
    },
    [nameToMapped, onCategoryClick]
  );

  const chartData = useMemo(() => {
    const result = data.map((d) => ({
      category: d.name,
      Utilization: Math.min(100, Math.round(d.percentage)),
      spent: d.spent,
      limit: d.limit
    }));
    console.log('chartData for radar:', result);
    return result;
  }, [data]);

  // Don't render if no data
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No budget data available</p>
          <p className="text-sm">Create a budget to see the radar visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} outerRadius={120} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="category"
            tick={(props) => <ClickableTick {...props} onClick={handleTickClick} />}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Tooltip
            formatter={(value: any, name: any, props: any) => [
              `${value}% used`,
              props.payload.category,
            ]}
            labelFormatter={(label) => `Category: ${label}`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Radar
            name="Utilization"
            dataKey="Utilization"
            stroke="#3b82f6"
            fill="#ef4444"
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        Click a category label to drill in. Red area increases as you approach your limit.
      </p>
    </div>
  );
};

export default BudgetRadarChart;