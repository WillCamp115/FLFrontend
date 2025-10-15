import json
import random
import argparse

def label_frivolous_transactions(input_file, output_file, label_percentage=0.25):
    # Load the data from the input JSON file
    with open(input_file, 'r') as f:
        data = json.load(f)

    # Assume transactions are stored in the "added" list
    transactions = data.get("added", [])
    total_transactions = len(transactions)

    # Calculate how many transactions should be labeled as frivolous
    num_frivolous = int(total_transactions * label_percentage)
    # Randomly select indices for transactions that will be labeled as frivolous
    frivolous_indices = set(random.sample(range(total_transactions), num_frivolous))

    # Add the "frivolous" tag to each transaction (1 for frivolous, 0 for not)
    for idx, txn in enumerate(transactions):
        txn["frivolous"] = 1 if idx in frivolous_indices else 0

    # Save the updated JSON data to the output file
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=4)
    

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Label a percentage of transactions as frivolous."
    )
    parser.add_argument(
        "--input", "-i", default="transaction_data.json",
        help="Input JSON file containing transactions"
    )
    parser.add_argument(
        "--output", "-o", default="test_data_labeled.json",
        help="Output JSON file to save labeled transactions"
    )
    parser.add_argument(
        "--percentage", "-p", type=float, default=0.25,
        help="Percentage of transactions to label as frivolous (e.g. 0.25 for 25%)"
    )

    args = parser.parse_args()
    label_frivolous_transactions(args.input, args.output, args.percentage)
