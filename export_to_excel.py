import os
import sys
import json
import pandas as pd
import argparse

def flatten_dict(d, parent_key='', sep='_'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def process_notations(data):
    """Processes notations.json data into a flat list of dicts for Excel."""
    rows = []
    project = data.get("project", "Unknown")
    
    # Idea
    idea_row = {"Project": project, "Section": "Idea"}
    idea_row.update(flatten_dict(data.get("idea", {}).get("criteria", {})))
    idea_row["Potential Score"] = data.get("idea", {}).get("idea_potential")
    rows.append(idea_row)
    
    # Team
    team_row = {"Project": project, "Section": "Team"}
    team_row.update(flatten_dict(data.get("team", {}).get("criteria", {})))
    team_row["Potential Score"] = data.get("team", {}).get("team_potential")
    rows.append(team_row)
    
    # Pilot
    pilot_row = {"Project": project, "Section": "Pilot"}
    pilot_row.update(flatten_dict(data.get("pilot", {}).get("criteria", {})))
    pilot_row["Potential Score"] = data.get("pilot", {}).get("pilot_potential")
    rows.append(pilot_row)
    
    return pd.DataFrame(rows)

def process_qualitative(data):
    """Processes qualitative.json data into a flat list of dicts for Excel."""
    project = data.get("project", "Unknown")
    flat_data = flatten_dict(data)
    flat_data["Project"] = project
    return pd.DataFrame([flat_data])

def process_agent_assessment(data):
    """Processes assessment.json data into a flat list of dicts for Excel."""
    rows = []
    call_summary = data.get("call_summary", "")
    final_verdict = data.get("final_verdict", "")
    
    performance = data.get("agent_performance", {})
    for criterion, rating in performance.items():
        rows.append({
            "Criterion": criterion.replace('_', ' ').capitalize(),
            "Rating": rating,
            "Final Verdict": final_verdict,
            "Call Summary": call_summary
        })
    return pd.DataFrame(rows)

def main():
    parser = argparse.ArgumentParser(description="Export assessment JSONs to a multi-tab Excel file.")
    parser.add_argument("base_name", help="Base name of the files in the outputs directory")
    
    args = parser.parse_args()
    outputs_dir = "outputs"
    
    files = {
        "Quantitative": f"{args.base_name}_gemini_notations.json",
        "Qualitative": f"{args.base_name}_gemini_qualitative.json",
        "Agent Assessment": f"{args.base_name}_gemini_assessment.json"
    }
    
    output_path = os.path.join(outputs_dir, f"{args.base_name}_final_assessment.xlsx")
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        for sheet_name, filename in files.items():
            file_path = os.path.join(outputs_dir, filename)
            if not os.path.exists(file_path):
                print(f"Warning: {file_path} not found. Skipping {sheet_name} tab.")
                continue
            
            with open(file_path, 'r') as f:
                data = json.load(f)
                
            if sheet_name == "Quantitative":
                df = process_notations(data)
            elif sheet_name == "Qualitative":
                df = process_qualitative(data)
            elif sheet_name == "Agent Assessment":
                df = process_agent_assessment(data)
                
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Formatting
            worksheet = writer.sheets[sheet_name]
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = (max_length + 2)
                worksheet.column_dimensions[column].width = min(adjusted_width, 50) # Cap width

    print(f"SUCCESS: Multi-tab assessment exported to {output_path}")

if __name__ == "__main__":
    main()
