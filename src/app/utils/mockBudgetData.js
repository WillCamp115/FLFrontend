// src/utils/mockBudgetData.js

// Mock budget data for testing the donut chart
export const mockBudgetData = {
  data: [
    {
      budget: {
        income: 4000, // This will be replaced by calculated average from backend
        goal_id: "goal1",
        fixed_costs: [
          {
            name: "Rent",
            limit: "1200"
          },
          {
            name: "Utilities",
            limit: "200"
          }
        ],
        variable_expenses: [
          {
            name: "Food and Drink",
            limit: "400"
          },
          {
            name: "Entertainment",
            limit: "100"
          },
          {
            name: "Travel",
            limit: "200"
          },
          {
            name: "Shops",
            limit: "300"
          }
        ]
      }
    }
  ]
};