import os
import json
import pandas as pd
from typing import Dict

def flatten_dict(d, parent_key='', sep='_'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

class ExportService:
    def __init__(self, outputs_dir: str = "outputs"):
        self.outputs_dir = outputs_dir

    def process_notations(self, data: Dict) -> pd.DataFrame:
        rows = []
        project = data.get("project", "Unknown")
        for section in ["idea", "team", "pilot"]:
            if section in data:
                row = {"Project": project, "Section": section.capitalize()}
                row.update(flatten_dict(data.get(section, {}).get("criteria", {})))
                row["Potential Score"] = data.get(section, {}).get(f"{section}_potential")
                rows.append(row)
        return pd.DataFrame(rows)

    def process_qualitative(self, data: Dict) -> pd.DataFrame:
        project = data.get("project", "Unknown")
        flat_data = flatten_dict(data)
        flat_data["Project"] = project
        return pd.DataFrame([flat_data])

    def process_agent_assessment(self, data: Dict) -> pd.DataFrame:
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

    def export_to_excel(self, base_name: str) -> str:
        files = {
            "Quantitative": f"{base_name}_notations.json",
            "Qualitative": f"{base_name}_qualitative.json",
            "Agent Assessment": f"{base_name}_assessment.json"
        }
        output_path = os.path.join(self.outputs_dir, f"{base_name}_final_assessment.xlsx")
        
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            for sheet_name, filename in files.items():
                file_path = os.path.join(self.outputs_dir, filename)
                if not os.path.exists(file_path):
                    continue
                
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    
                if sheet_name == "Quantitative":
                    df = self.process_notations(data)
                elif sheet_name == "Qualitative":
                    df = self.process_qualitative(data)
                elif sheet_name == "Agent Assessment":
                    df = self.process_agent_assessment(data)
                else:
                    df = pd.DataFrame()
                    
                if not df.empty:
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    # Simple column width adjustment
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
                        worksheet.column_dimensions[column].width = min(adjusted_width, 50)
        return output_path
