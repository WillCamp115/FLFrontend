// app/goals/page.js
"use client";
import { useState, useEffect } from "react";
import NavBar from "../components/navigation/NavBar";
//import { apiClient } from "../lib/apiClient";

export default function GoalsPage() {
    const [goals, setGoals] = useState([]); // State for existing goals (fetched from DB in the future)
    const [showForm, setShowForm] = useState(false);
    const [goalType, setGoalType] = useState("savings");
    const [goalName, setGoalName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentProgress, setCurrentProgress] = useState("");
    const [ir, setIr] = useState(""); // Only for debt-free goals
    const [interestRatePeriod, setInterestRatePeriod] = useState("yearly");
    const [error, setError] = useState(null); // Added for error messages
    const [success, setSuccess] = useState(null); // Added for success messages

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        try {
            setError(null);
            setSuccess(null);

            // Fetch savings goals using authenticated API
            const savingsGoals = await apiClient.getGoals();
            const formattedSavingsGoals = savingsGoals.map((goal) => ({
                name: goal.goal_name,
                type: goal.goal_type || "savings", // Default to "savings" if not specified
                target_amount: goal.target_amount,
                current_progress: goal.progress || 0.0,
                interest_rate: 0.0, // Default for savings goals
                interest_type: null,
                start_date: null,
                end_date: null,
            }));

            // Fetch debt-free goals using authenticated API
            const debtGoals = await apiClient.getDebtGoals();
            const formattedDebtGoals = debtGoals.map((goal) => ({
                name: goal.goal_name,
                type: goal.goal_type || "debt_free", // Default to "debt_free" if not specified
                target_amount: goal.target_amount,
                current_progress: goal.progress || 0.0,
                interest_rate: goal.interest_rate || 0.0,
                interest_type: goal.interest_type || "yearly",
                start_date: goal.start_date,
                end_date: goal.end_date,
            }));

            // Combine both types of goals
            const allGoals = [...formattedSavingsGoals, ...formattedDebtGoals];
            setGoals(allGoals);
            console.log("Combined goals:", allGoals);
        } catch (err) {
            setError(err.message || "Failed to fetch goals");
            console.error("Error fetching goals:", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newGoal = {
            goal_name: goalName,
            goal_type: goalType,
            target_amount: parseFloat(targetAmount),
            progress: parseFloat(currentProgress),
            ...(goalType === "debt_free" && {
                interest_rate: parseFloat(ir) || 0.0, // Use interest_rate to match DebtGoal schema
                interest_type: interestRatePeriod || "yearly", // Use interest_type to match DebtGoal schema
                start_date: new Date().toISOString().split('T')[0], // Current date as default
                end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // One year from now as default
            }),
        };

        console.log("Submitting goal payload:", newGoal);

        try {
            setError(null);
            setSuccess(null);
            let response;
            if (goalType === "debt_free") {
                response = await apiClient.createDebtGoal(newGoal);
                console.log(response)
            } else {
                response = await apiClient.createGoal(newGoal);
            }
            console.log("Goal creation response:", response); // Debug log
            setSuccess("Goal created successfully!");
            await fetchGoals();
            setGoalName("");
            setGoalType("savings");
            setTargetAmount("");
            setCurrentProgress("");
            setIr("");
            setShowForm(false);
        } catch (err) {
            let errorMessage = "Failed to create goal";
            if (err.message && err.message.includes("Goal already created")) {
                errorMessage = "You cannot create two goals with the same name.";
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error("Error creating goal:", err);
        }
    };

    const handleDelete = async (goal_name) => {
        try {
            setError(null);
            setSuccess(null);
            console.log(goal_name)
            await apiClient.deleteGoal(goal_name);
            setSuccess("Goal deleted successfully!");
            await fetchGoals(); // Refresh the goals list
        } catch (err) {
            setError(err.message || "Failed to delete goal");
            console.error(err);
        }

    };
    return (
        <main className="bg-white">
            <NavBar />

            {/* Page Content */}
            <section className="p-8">
                <h1 className="text-2xl font-bold text-black mb-4">Goals</h1>

                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-black mb-4">Your Goals</h2>
                    {goals.length === 0 ? (
                        <p className="text-gray-600">You have no goals yet. Create one below!</p>
                    ) : (
                        <div className="bg-white p-4 rounded shadow-md">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 text-black">Name</th>
                                        <th className="py-2 text-black">Type</th>
                                        <th className="py-2 text-black">Target Amount</th>
                                        <th className="py-2 text-black">Current Progress</th>
                                        {goals.some((goal) => goal.type === "debt_free") && (
                                            <>
                                                <th className="py-2 text-black">Interest Rate</th>
                                                <th className="py-2 text-black">Period</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {goals.map((goal) => (
                                        <tr key={goal.name} className="border-b">
                                            <td className="py-2 text-black">{goal.name}</td>
                                            <td className="py-2 text-black">
                                                {goal.type === "savings" ? "Savings" : "Debt-Free"}
                                            </td>
                                            <td className="py-2 text-black">${goal.target_amount.toFixed(2)}</td>
                                            <td className="py-2 text-black">${goal.current_progress.toFixed(2)}</td>
                                            {goal.type === "debt_free" && (
                                                <>
                                                    <td className="py-2 text-black">{(goal.interest_rate || 0).toFixed(2)}%</td>
                                                    <td className="py-2 text-black">
                                                        {goal.interest_type === "yearly" ? "Yearly" : "Monthly"}
                                                    </td>
                                                </>
                                            )}
                                            <td className="py-2 text-black">
                                                <button
                                                    onClick={() => handleDelete(goal.name)}
                                                    className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Create New Goal Section */}
                <div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
                    >
                        {showForm ? "Cancel" : "Create New Goal"}
                    </button>

                    {showForm && (
                        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-md">
                            {error && (
                                <div className="mb-4 p-2 bg-red-100 text-red-700 border border-red-400 rounded">
                                    {error}
                                </div>
                            )}
                            <div className="mb-4">
                                <label className="block text-black mb-2" htmlFor="goalType">
                                    Goal Type
                                </label>
                                <select
                                    id="goalType"
                                    value={goalType}
                                    onChange={(e) => setGoalType(e.target.value)}
                                    className="w-full p-2 border rounded text-black"
                                >
                                    <option value="savings">Savings Goal</option>
                                    <option value="debt_free">Debt-Free Goal</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-black mb-2" htmlFor="goalName">
                                    Goal Name
                                </label>
                                <input
                                    type="text"
                                    id="goalName"
                                    value={goalName}
                                    onChange={(e) => setGoalName(e.target.value)}
                                    className="w-full p-2 border rounded text-black"
                                    placeholder="e.g., Save for Vacation"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-black mb-2" htmlFor="targetAmount">
                                    Target Amount ($)
                                </label>
                                <input
                                    type="number"
                                    id="targetAmount"
                                    value={targetAmount}
                                    onChange={(e) => setTargetAmount(e.target.value)}
                                    className="w-full p-2 border rounded text-black"
                                    placeholder="e.g., 5000"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-black mb-2" htmlFor="currentProgress">
                                    Current Progress ($)
                                </label>
                                <input
                                    type="number"
                                    id="currentProgress"
                                    value={currentProgress}
                                    onChange={(e) => setCurrentProgress(e.target.value)}
                                    className="w-full p-2 border rounded text-black"
                                    placeholder="e.g., 1000"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>

                            {goalType === "debt_free" && (
                                <div className="mb-4">
                                    <label className="block text-black mb-2" htmlFor="ir">
                                        Interest Rate (%)
                                    </label>
                                    <div className="flex space-x-4">
                                        <input
                                            type="number"
                                            id="ir"
                                            value={ir}
                                            onChange={(e) => setIr(e.target.value)}
                                            className="w-1/2 p-2 border rounded text-black"
                                            placeholder="e.g., 5.5"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                        <select
                                            id="interestRatePeriod"
                                            value={interestRatePeriod}
                                            onChange={(e) => setInterestRatePeriod(e.target.value)}
                                            className="w-1/2 p-2 border rounded text-black"
                                        >
                                            <option value="yearly">Yearly (APY)</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Create Goal
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}